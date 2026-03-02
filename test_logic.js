const fs = require('fs');

const allCoursesStr = fs.readFileSync('courses.json', 'utf8');
const allCourses = JSON.parse(allCoursesStr);

let selectedCourses = {};
const gridState = Array(6).fill(null).map(() => Array(11).fill(null));

function checkConflicts(course) {
    if (!course.schedules || course.schedules.length === 0) return null;
    for (const schedule of course.schedules) {
        if (schedule.day < 1 || schedule.day > 5) continue;
        for (const period of schedule.periods) {
            if (period < 1 || period > 10) continue;
            const existingCourseId = gridState[schedule.day][period];
            if (existingCourseId) {
                return selectedCourses[existingCourseId];
            }
        }
    }
    return null;
}

function addCourse(course) {
    const conflict = checkConflicts(course);
    if (conflict) {
        console.log(`CONFLICT: Cannot add ${course.name}. Conflicts with ${conflict.name}`);
        return false;
    }

    selectedCourses[course.id] = course;
    if (course.schedules) {
        course.schedules.forEach(schedule => {
            if (schedule.day < 1 || schedule.day > 5) return;
            schedule.periods.forEach(period => {
                if (period < 1 || period > 10) return;
                gridState[schedule.day][period] = course.id;
            });
        });
    }
    console.log(`SUCCESS: Added ${course.name}`);
    return true;
}

const courseA = allCourses.find(c => c.schedules && c.schedules[0] && c.schedules[0].day === 1 && c.schedules[0].periods.includes(3));
const courseB = allCourses.find(c => c.id !== courseA.id && c.schedules && c.schedules[0] && c.schedules[0].day === 1 && c.schedules[0].periods.includes(3));

console.log("Testing with:");
if (courseA) console.log("- Course A:", courseA.name, JSON.stringify(courseA.schedules));
if (courseB) console.log("- Course B:", courseB.name, JSON.stringify(courseB.schedules));

addCourse(courseA);
addCourse(courseB);

console.log("Grid[1][3]:", gridState[1][3] === courseA.id ? "Correct" : "FAILED");
