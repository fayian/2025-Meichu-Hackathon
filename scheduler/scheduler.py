import datetime as dt
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# --- 設定 ---
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events']
WORKING_HOURS_START = 9
WORKING_HOURS_END = 18
SEARCH_STEP_MINUTES = 15
# 午休時間
LUNCH_BREAK_START = 12
LUNCH_BREAK_END = 13

# --- Google API 認證 ---
def get_calendar_service():
    creds = None
    if os.path.exists('../scheduler/token.json'):
        creds = Credentials.from_authorized_user_file('../scheduler/token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('../scheduler/credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('../scheduler/token.json', 'w') as token:
            token.write(creds.to_json())
    try:
        service = build('calendar', 'v3', credentials=creds)
        return service
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None

# --- 事件建立與讀取 ---
def create_calendar_event(service, task_name, start_dt, end_dt):
    event = {
        'summary': f"{task_name}",
        'description': '由智能排程工具自動安排',
        'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Taipei'},
        'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Taipei'},
    }
    try:
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        print(f"  └─ 成功建立事件: {start_dt.strftime('%Y-%m-%d %H:%M')} - {end_dt.strftime('%H:%M')} -> {created_event.get('summary')}")
        return created_event
    except HttpError as error:
        print(f'  └─ 建立事件時發生錯誤: {error}')
        return None

def get_all_busy_slots(service, start_range, end_range):
    print("正在讀取所有日曆的事件資訊...")
    busy_slots = []
    calendar_list = service.calendarList().list().execute()
    for calendar_list_entry in calendar_list['items']:
        cal_id = calendar_list_entry['id']
        print(f"  - 正在檢查日曆: {calendar_list_entry.get('summary', cal_id)}")
        try:
            events_result = service.events().list(
                calendarId=cal_id, timeMin=start_range.isoformat(), timeMax=end_range.isoformat(),
                singleEvents=True, orderBy='startTime'
            ).execute()
            existing_events = events_result.get('items', [])
            tz = start_range.tzinfo
            for event in existing_events:
                if event.get('transparency') == 'transparent':
                    continue
                event_start_str = event['start'].get('dateTime', event['start'].get('date'))
                event_end_str = event['end'].get('dateTime', event['end'].get('date'))
                if event_start_str and event_start_str.endswith('Z'):
                    event_start_str = event_start_str.replace('Z', '+00:00')
                if event_end_str and event_end_str.endswith('Z'):
                    event_end_str = event_end_str.replace('Z', '+00:00')
                if 'T' not in event_start_str:
                    event_start = dt.datetime.fromisoformat(event_start_str).replace(tzinfo=tz)
                    event_end = event_start + dt.timedelta(days=1)
                else:
                    event_start = dt.datetime.fromisoformat(event_start_str).astimezone(tz)
                    event_end = dt.datetime.fromisoformat(event_end_str).astimezone(tz)
                busy_slots.append((event_start, event_end))
        except HttpError as e:
            print(f"    └─ 無法讀取日曆 '{cal_id}' 的事件，已跳過。錯誤: {e}")
    print("所有日曆讀取完畢。")
    return sorted(busy_slots)

# --- 排程策略 ---
def schedule_task(service, task, start_search_dt, busy_slots):
    """為任務尋找時段，並自動處理午休分割"""
    print(f"🔍 正在為 '{task['name']}' (需連續工作 {task['duration_minutes']} 分鐘) 尋找空檔...")
    
    current_time = start_search_dt
    end_search_dt = task['due_date']
    
    while current_time < end_search_dt:
        # 1. 將 current_time 對齊到一個可工作的、非忙碌的起點
        # 校準到工作時間
        working_day_start = current_time.replace(hour=WORKING_HOURS_START, minute=0, second=0, microsecond=0)
        if current_time < working_day_start:
            current_time = working_day_start

        # 處理午休時間
        # 定義當天的午休時間
        lunch_start = current_time.replace(hour=LUNCH_BREAK_START, minute=0)
        lunch_end = current_time.replace(hour=LUNCH_BREAK_END, minute=0)
        
        # 如果當前時間點正好在午休，直接跳到午休結束
        if current_time >= lunch_start and current_time < lunch_end:
            current_time = lunch_end
            continue

        # 檢查是否在其他忙碌時段內，如果是，則跳過
        is_inside_busy_slot = False
        for busy_start, busy_end in busy_slots:
            if current_time >= busy_start and current_time < busy_end:
                current_time = busy_end
                is_inside_busy_slot = True
                break
        if is_inside_busy_slot:
            continue

        # 2. 檢查從 current_time 開始，是否有足夠的「工作時間」
        slot_start = current_time
        duration_needed = dt.timedelta(minutes=task['duration_minutes'])
        
        # 重新計算預計的結束時間，考慮午休
        slot_end_unadjusted = slot_start + duration_needed
        if slot_start < lunch_start and slot_end_unadjusted > lunch_start:
            # 如果任務跨越了午休，結束時間需要加上午休時長
            slot_end = slot_end_unadjusted + dt.timedelta(hours=(LUNCH_BREAK_END - LUNCH_BREAK_START))
        else:
            # 沒跨越午休
            slot_end = slot_end_unadjusted

        # 3. 檢查這個計算出的「邏輯時段」是否符合所有條件
        if slot_end > end_search_dt:
            return None # 這個起點太晚了，不可能完成任務

        working_day_end = slot_start.replace(hour=WORKING_HOURS_END, minute=0)
        if slot_end > working_day_end:
            current_time = (current_time + dt.timedelta(days=1)).replace(hour=WORKING_HOURS_START, minute=0)
            continue
            
        # 4. 檢查是否有衝突
        is_free = True
        slots_to_check = []
        if slot_start < lunch_start and slot_end > lunch_end: # 跨越午休
            slots_to_check.append((slot_start, lunch_start))
            slots_to_check.append((lunch_end, slot_end))
        else: # 未跨越
            slots_to_check.append((slot_start, slot_end))

        for check_start, check_end in slots_to_check:
            for busy_start, busy_end in busy_slots:
                if max(check_start, busy_start) < min(check_end, busy_end):
                    is_free = False
                    current_time = busy_end
                    break
            if not is_free:
                break
        
        # 5. 如果所有檢查都通過，建立事件並返回
        if is_free:
            created_count = 0
            for i, (event_start, event_end) in enumerate(slots_to_check):
                task_name_part = f"{task['name']}"
                if len(slots_to_check) > 1:
                    task_name_part += f" (部分 {i+1})"
                
                event = create_calendar_event(service, task_name_part, event_start, event_end)
                if event:
                    created_count += 1
            
            if created_count == len(slots_to_check):
                return (slot_start, slot_end)
            else:
                print("警告: 任務區塊建立不完整。")
                return None

        if current_time == slot_start:
            current_time += dt.timedelta(minutes=SEARCH_STEP_MINUTES)
    
    return None
# --- 主執行函式 ---
def schedule_all_tasks(service, tasks):
    priority_map = {'高': 1, '中': 2, '低': 3}
    sorted_tasks = sorted(tasks, key=lambda x: (priority_map[x['priority']], x['due_date']))
    now = dt.datetime.now().astimezone()

    # 初始化結果物件
    scheduling_results = {
        "successful": [],
        "failed": []
    }

    if not sorted_tasks:
        print("待辦事項列表為空。")
        return scheduling_results

    last_due_date = max(t['due_date'] for t in sorted_tasks)
    master_busy_slots = get_all_busy_slots(service, now, last_due_date)

    for task in sorted_tasks:
        task_name = task['name']
        print("\n" + "="*60)
        print(f"處理任務: {task_name} (優先級: {task['priority']}, 截止於: {task['due_date'].strftime('%Y-%m-%d %H:%M')})")

        if task['due_date'] < now:
            print(f"警告: 任務 '{task_name}' 的截止日期已過，跳過排程。")
            scheduling_results["failed"].append({
                "name": task_name,
                "reason": "截止日期已過 (Due date has passed)"
            })
            continue

        new_slot = schedule_task(service, task, now, master_busy_slots)
        
        if new_slot:
            master_busy_slots.append(new_slot)
            master_busy_slots.sort()
            print(f"任務 '{task_name}' 已成功排入行事曆。")
            scheduling_results["successful"].append({
                "name": task_name,
                "start": new_slot[0].isoformat(),
                "end": new_slot[1].isoformat()
            })
        else:
            print(f"警告: 找不到適合的時段來安排任務 '{task_name}'。")
            scheduling_results["failed"].append({
                "name": task_name,
                "reason": "找不到適合的時段 (Could not find a suitable time slot)"
            })
    
    print("\n" + "="*60)
    print("所有任務處理完畢。")
    
    # 回傳結構化的結果
    return scheduling_results

# --- 主程式執行區 ---
if __name__ == '__main__':
    local_tz = dt.datetime.now().astimezone().tzinfo
    now = dt.datetime.now(local_tz)
    my_todo_list = [
        {"name": "與行銷團隊的策略會議", "duration_minutes": 90, "due_date": now + dt.timedelta(days=1), "priority": "高"},
        {"name": "完成產品規格書初稿", "duration_minutes": 180, "due_date": now + dt.timedelta(days=3), "priority": "高"},
        {"name": "預約年度健康檢查", "duration_minutes": 30, "due_date": now + dt.timedelta(days=5), "priority": "低"},
        {"name": "研究並比較三家雲端服務供應商", "duration_minutes": 240, "due_date": now + dt.timedelta(days=4), "priority": "中"}
    ]
    service = get_calendar_service()
    if service:
        schedule_all_tasks(service, my_todo_list)