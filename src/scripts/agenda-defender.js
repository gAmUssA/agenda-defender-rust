import { invoke } from '@tauri-apps/api';
import { open } from '@tauri-apps/api/shell';

// Example templates
const templates = {
    lightning: "Introduction\nDemo\nQ&A",
    talk: "14:00 Introduction\n14:10 Main Topic\n14:35 Q&A\n14:45 Wrap up",
    meeting: "09:00 Stand-up\n09:15 Sprint Review\n09:45 Break\n10:00 Planning"
};

function AgendaItem(timePart1, timePart2, text) {
    this.timePart1 = timePart1;
    this.timePart2 = timePart2;
    var tokens = text.split(' ');
    if (/^#[0-9a-f]{3,6}$/i.test(tokens[1])) {
        var prefix = tokens.shift();
        this.color = tokens.shift();
        this.text = prefix + ' ' + tokens.join(' ');
    } else {
        this.text = text;
    }
    this.isRelativeMode = timePart1 == 0 && timePart2 == 0;
    this.getAbsoluteTime = function () {
        var time = new Date();
        time.setHours(timePart1);
        time.setMinutes(timePart2);
        time.setSeconds(0);
        time.setMilliseconds(0);
        return time;
    }
    this.getRelativeTime = function (baseline) {
        var time = new Date(baseline);
        time.setMinutes(time.getMinutes() + timePart1);
        time.setSeconds(time.getSeconds() + timePart2);
        return (time);
    }
}

var Agenda = {
    parseItem: function (itemString) {
        try {
            var agendaItemRegExp = /^(\d\d):(\d\d)\s+(.*)$/;
            var tokens = agendaItemRegExp.exec(itemString);
            var p1 = parseInt(tokens[1]);
            var p2 = parseInt(tokens[2]);
            return new AgendaItem(p1, p2, itemString);
        } catch (e) {
            console.warn(e);
            return (null);
        }
    },

    parse: function (agendaString) {
        var items = agendaString.split(/\n/).map(line => this.parseItem(line)).filter(line => line != null);
        var relativeMode = items[0].isRelativeMode;
        var now = new Date();
        items.forEach(item => item.commencesAt = (relativeMode ? item.getRelativeTime(now) : item.getAbsoluteTime()));
        for (var i = 0; i < (items.length - 1); i++) items[i].concludesAt = items[i + 1].commencesAt;
        items.pop();
        console.debug(items);
        return items;
    }
}

function drawSampleAgenda(event) {
    console.log('Drawing sample agenda');
    var topics = [
        "This is Agenda Defender!",
        "List your agenda items",
        "Times are local, 24-hour clock, HH:mm",
        "Put the FINISH time last",
        "Then click 'GO!'",
        "Use it to run meetings,",
        "for giving talks and presentations,",
        "or whatever you like, really :)"
    ];
    var time = new Date();
    time.setMinutes(time.getMinutes() - 5);
    var items = topics.map(topic => {
        var timeStr = time.getHours().toString().padStart(2, '0') + ":" + 
                     time.getMinutes().toString().padStart(2, '0');
        time.setMinutes(time.getMinutes() + 2);
        return timeStr + " " + topic;
    });
    
    var finishTime = time.getHours().toString().padStart(2, '0') + ":" + 
                     time.getMinutes().toString().padStart(2, '0');
    items.push(finishTime + " FINISH");
    
    var agenda = items.join("\n");
    console.log('Setting agenda:', agenda);
    $("#agenda").val(agenda);
    if (event) event.preventDefault();
}

function draw45MinuteTalk(event) {
    console.log('Drawing 45 minute talk');
    const agenda = `00:00 Intro and welcome
05:00 Context: why are database deployments hard?
08:00 Rolling forward, rolling back
13:00 Schema management
18:00 Working with static data and lookup data
25:00 Live demonstration
40:00 Conclusion and next steps
45:00 FINISH`;
    $("#agenda").val(agenda);
    if (event) event.preventDefault();
}

function drawLightningTalk(event) {
    console.log('Drawing lightning talk');
    const agenda = `00:00 Introduction to lightning talks
00:30 How I learned to love three-minute talks
01:00 The history of pecha kucha
01:30 Rehearsal tips for lightning talks
02:00 Scheduling tips
02:30 Funny stories
03:00 FINISH`;
    $("#agenda").val(agenda);
    if (event) event.preventDefault();
}

let timerInterval;

// Theme handling
function setTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme === 'dark');
    $('#themeToggle').prop('checked', savedTheme === 'dark');
}

// Timer functions
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function updateTimer() {
    try {
        const remainingSeconds = await invoke('get_remaining_time');
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            $('#timeRemaining').text('00:00');
            $('#nextButton').prop('disabled', false);
            return;
        }
        $('#timeRemaining').text(formatTime(remainingSeconds));
    } catch (error) {
        console.error('Error updating timer:', error);
    }
}

async function startTimer() {
    try {
        await invoke('start_timer');
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    } catch (error) {
        console.error('Error starting timer:', error);
    }
}

async function nextItem() {
    try {
        const nextItem = await invoke('next_item');
        if (nextItem) {
            $('#currentItemTitle').text(nextItem.title);
            $('#nextButton').prop('disabled', true);
            startTimer();
        } else {
            $('#currentItemTitle').text('All Done!');
            $('#timeRemaining').text('--:--');
            $('#nextButton').prop('disabled', true);
        }
    } catch (error) {
        console.error('Error getting next item:', error);
    }
}

function runMeeting() {
    console.log('Running meeting');
    var agendaString = $("#agenda").val();
    console.log('Agenda text:', agendaString);
    var agenda = Agenda.parse(agendaString);
    var $ticker = $("#ticker");
    $ticker.html('');
    
    agenda.forEach(function (item, index, array) {
        var $div = $("<div class='agenda-item' />");
        var $span = $("<span class='agenda-item-text' />")
        $span.text(item.text);
        
        // Calculate font size based on viewport height and number of items
        var viewportHeight = window.innerHeight;
        var fontSize = Math.min(72, Math.max(24, Math.floor(viewportHeight / (agenda.length * 2))));
        $span.css("font-size", fontSize + "px");
        $span.css("line-height", (fontSize * 1.2) + "px");
        
        $div.append($span);
        
        var $progressBar = $("<div class='progress-bar' />");
        if (item.color) $progressBar.css("background-color", item.color);
        
        item.element = $div;
        item.progressBar = $progressBar;
        $div.append($progressBar);
        $ticker.append($div);
    });
    
    $("#ticker").show();
    $("#close-ticker").show();
    window.ticker = window.setInterval(makeTicker(agenda), 10);
    window.running = true;
    
    // Add resize handler to adjust font size when window is resized
    $(window).on('resize.agendaDefender', function() {
        var viewportHeight = window.innerHeight;
        var fontSize = Math.min(72, Math.max(24, Math.floor(viewportHeight / (agenda.length * 2))));
        $('.agenda-item-text').css({
            "font-size": fontSize + "px",
            "line-height": (fontSize * 1.2) + "px"
        });
    });
}

function makeTicker(agenda) {
    return function () {
        var now = new Date();
        agenda.forEach(function (item, index, array) {
            if (item.concludesAt < now) {
                item.progressBar.hide();
                item.element.addClass('finished');
            }
            if (item.commencesAt < now && item.concludesAt > now) {
                var duration = item.concludesAt.valueOf() - item.commencesAt.valueOf();
                var elapsed = now.valueOf() - item.commencesAt.valueOf();
                var multiplier = elapsed / duration;
                var newWidth = item.element.width() * multiplier;
                item.progressBar.css("width", newWidth + "px");
            }
        });
    };
}

function stopMeeting() {
    console.log('Stopping meeting');
    window.clearInterval(window.ticker);
    window.running = false;
    $("#ticker").hide();
    $("#close-ticker").hide();
    // Remove resize handler
    $(window).off('resize.agendaDefender');
}

// Theme management
const ThemeManager = {
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    },

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme');
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
    },

    updateThemeIcon(theme) {
        const button = document.getElementById('theme-toggle');
        if (theme === this.THEMES.DARK) {
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"></path>
                </svg>`;
        } else {
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>`;
        }
    },

    initialize() {
        const button = document.getElementById('theme-toggle');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = prefersDark ? this.THEMES.DARK : this.THEMES.LIGHT;
        
        this.setTheme(initialTheme);

        button.addEventListener('click', () => {
            const currentTheme = this.getCurrentTheme();
            const newTheme = currentTheme === this.THEMES.LIGHT ? this.THEMES.DARK : this.THEMES.LIGHT;
            this.setTheme(newTheme);
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const newTheme = e.matches ? this.THEMES.DARK : this.THEMES.LIGHT;
            this.setTheme(newTheme);
        });
    }
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document ready');
    
    // Initialize theme manager
    ThemeManager.initialize();
    
    // Draw sample agenda
    drawSampleAgenda();

    // Setup event handlers for example links
    document.getElementById('lightning-talk').addEventListener('click', function(e) {
        e.preventDefault();
        drawLightningTalk(e);
    });
    
    document.getElementById('45-minute-talk').addEventListener('click', function(e) {
        e.preventDefault();
        draw45MinuteTalk(e);
    });
    
    document.getElementById('absolute-example').addEventListener('click', function(e) {
        e.preventDefault();
        drawSampleAgenda(e);
    });
    
    document.getElementById('close-ticker').addEventListener('click', function(e) {
        e.preventDefault();
        stopMeeting();
    });
    
    document.getElementById('run-meeting-button').addEventListener('click', runMeeting);
    
    // Handle external links
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            const url = this.getAttribute('href');
            console.log('Opening external link:', url);
            await open(url);
        });
    });
    
    // Setup keyboard shortcuts
    document.addEventListener('keyup', function(e) {
        if (e.key === "Escape") stopMeeting();
    });

    // Handle window resize
    window.addEventListener("resize", function() {
        if (window.running) runMeeting();
    }, false);
});
