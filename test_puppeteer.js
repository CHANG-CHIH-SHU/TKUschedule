const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Catch console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
    
    console.log("Page loaded. Checking title:", await page.title());
    
    // Check if courses loaded
    const deptCount = await page.evaluate(() => document.querySelectorAll('#department-select option').length);
    console.log(`Found ${deptCount} departments in selector`);
    
    // Select first real department
    await page.select('#department-select', 'A01');
    await new Promise(r => setTimeout(r, 500));
    
    const courseCount = await page.evaluate(() => document.querySelectorAll('.course-card').length);
    console.log(`Found ${courseCount} courses in list after selecting A01`);
    
    // Click a course to add it
    console.log("Adding first course...");
    await page.click('.course-card:nth-child(1)');
    await new Promise(r => setTimeout(r, 500));
    
    // Verify it appeared in timetable
    const scheduledBlocks = await page.evaluate(() => document.querySelectorAll('.schedule-block').length);
    console.log(`Blocks in timetable: ${scheduledBlocks}`);
    
    await browser.close();
})();
