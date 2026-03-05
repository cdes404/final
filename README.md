Final Project - Interactive Data Visualization  

## Project Website: https://cdes404.github.io/final/

## Project Presentation: https://drive.google.com/file/d/1f3xflxbEuhB-w_hkpPYoZBvWP0N0FbBi/view?usp=sharing

## Presidential Schedules

Desc: This project is an interactive data visualization that analyzes the public schedule of President Donald Trump and his Administration. The visualization allows users to explore how the administration's time was allocated during the selected time period by examining the types of activities scheduled each day. The goal of the project is to reveal patterns in associations with people and groups, priorities, strategy, leadership style, and personal delights. 

This project aims to understand the administration's agenda and answer questions like: 
- How does the president divide time between meetings, public events, and travel?
- Who does the president meet with most frequently?
- What types of events are used for messaging (speeches, briefings, rallies)?
- How frequently does the president travel vs. stay at the White House?
- Are there large blocks of unstructured time?
- What is the most common meeting type?

The website supports:
- A two-month calendar view (January–February 2026)
- Color-coded event categories (Press, Policy, Meeting, Travel, Other)
- An interactive details panel that updates on day click
- A left-side analysis panel summarizing key patterns (busiest days, weekday distribution, top locations, category breakdown)

## Code
Libraries Used: D3.js (v7): Used for data loading (d3.csv), date parsing/formatting (d3.timeParse, d3.timeFormat), grouping and aggregation (d3.group, d3.rollups), and DOM-driven rendering/updates

Custom Code (written by us):
- Data processing pipeline in main.js
- Interactive visualization logic
- Analysis computations

## Technical Achievements
- Implemented a data processing system using D3 to load, parse, and normalize schedule data from CSV format
- Built a category mapping system that converts raw schedule metadata and event text into consistent visualization categories (Press, Policy, Meeting, Travel, Other)
- Developed a calendar render that correctly aligns weekdays, aggregates events by day, and displays category summaries using color-coded bars
- Created an interactive details panel that updates on click to show all events for a selected day
- Computed automated summary statistics (total events, busiest dates, weekday distribution, top locations, and category counts) directly from the dataset
## Design Achievements
- Designed a 3 panel layout combining summary statistics, calendar overview, and event details to support both exploration and quick insights
- Used color coding and a legend to make event types easy to recognize across the calendar
- Implemented an overview + details-on-demand interaction, allowing users to click any day to see its full schedule
