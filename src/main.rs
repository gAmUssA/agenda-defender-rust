use chrono::{DateTime, Duration, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{generate_handler, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AgendaItem {
    title: String,
    duration_minutes: i64,
    start_time: Option<String>,
    completed: bool,
}

#[derive(Debug, Default)]
struct AgendaState(Mutex<Vec<AgendaItem>>);

#[tauri::command]
fn add_agenda_items(state: State<AgendaState>, items: Vec<AgendaItem>) -> Result<(), String> {
    let mut agenda = state.0.lock().map_err(|_| "Failed to lock agenda state")?;
    *agenda = items;
    Ok(())
}

#[tauri::command]
fn start_timer(state: State<AgendaState>) -> Result<(), String> {
    let mut agenda = state.0.lock().map_err(|_| "Failed to lock agenda state")?;
    if let Some(item) = agenda.get_mut(0) {
        item.start_time = Some(Utc::now().to_rfc3339());
    }
    Ok(())
}

#[tauri::command]
fn get_current_item(state: State<AgendaState>) -> Result<Option<AgendaItem>, String> {
    let agenda = state.0.lock().map_err(|_| "Failed to lock agenda state")?;
    Ok(agenda.first().cloned())
}

#[tauri::command]
fn get_remaining_time(state: State<AgendaState>) -> Result<i64, String> {
    let agenda = state.0.lock().map_err(|_| "Failed to lock agenda state")?;

    if let Some(item) = agenda.first() {
        if let Some(start_time_str) = &item.start_time {
            if let Ok(start_time) = DateTime::parse_from_rfc3339(start_time_str) {
                let end_time = start_time + Duration::minutes(item.duration_minutes);
                let now = Utc::now();
                if now < end_time {
                    return Ok((end_time - now).num_seconds());
                }
            }
        }
    }
    Ok(0)
}

#[tauri::command]
fn next_item(state: State<AgendaState>) -> Result<Option<AgendaItem>, String> {
    let mut agenda = state.0.lock().map_err(|_| "Failed to lock agenda state")?;
    if !agenda.is_empty() {
        agenda.remove(0);
    }
    Ok(agenda.first().cloned())
}

#[tauri::command]
fn parse_agenda_text(input: String) -> Result<Vec<AgendaItem>, String> {
    let mut items = Vec::new();

    for line in input.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Try to parse time if it starts with time format (HH:MM)
        if let Some(space_pos) = line.find(' ') {
            if let Ok(time) = NaiveTime::parse_from_str(&line[..space_pos], "%H:%M") {
                let title = line[space_pos..].trim().to_string();
                let duration_minutes = if items.is_empty() {
                    15 // Default duration for first item
                } else {
                    // Calculate duration based on time difference
                    if let Ok(prev_time) = NaiveTime::parse_from_str(
                        &items.last().unwrap().start_time.as_ref().unwrap()[11..16],
                        "%H:%M",
                    ) {
                        ((time - prev_time).num_minutes()).max(1)
                    } else {
                        15 // Fallback duration
                    }
                };

                items.push(AgendaItem {
                    title,
                    duration_minutes,
                    start_time: Some(format!("2025-01-08T{}:00Z", line[..space_pos].trim())),
                    completed: false,
                });
                continue;
            }
        }

        // If no time format found, use default duration
        items.push(AgendaItem {
            title: line.to_string(),
            duration_minutes: 15,
            start_time: None,
            completed: false,
        });
    }

    Ok(items)
}

fn main() {
    tauri::Builder::default()
        .manage(AgendaState::default())
        .invoke_handler(tauri::generate_handler![
            add_agenda_items,
            start_timer,
            get_current_item,
            get_remaining_time,
            next_item,
            parse_agenda_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
