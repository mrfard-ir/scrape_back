// Constants
const { openBrowser } = require('./utils');
const requests = new Map();

const updateStatus = (res, requestId) => {
    if (requests.get(requestId)) {
        res.json(requests.get(requestId).messages);
        requests.get(requestId).messages = [];
    } else {
        res.status(404).json(['Request id not found.']);
    }
}

const stopScraping = (res, requestId) => {
    if (requests.get(requestId)) {
        res.json({ message: `Stop command for the process with ID ${requestId} received.` });
        requests.get(requestId).processing = false;
    } else {
        res.status(404).json({ message: 'Request id not found.' });
    }
}

const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const sendMessage = (message, requestId) => {
    requests.get(requestId).messages.push(message);
}

const startScraping = async (res, url, keywords, proxy) => {
    // Set the request id
    const requestId = generateUniqueId();
    requests.set(requestId, { processing: true, messages: [] });
    res.json({ message: `Request ID has been set to ${requestId}.`, requestId: requestId });
    // Start log
    console.log(`Process ${requestId} started.`);
    // Launch the browser
    let { browser, page, proxyResult } = await openBrowser(proxy);
    sendMessage(proxyResult, requestId);
    sendMessage(`Initial browser launch was successful.`, requestId);
    let attempt = 0, cookieSet = false;
    outer: while (true) {
        // Iterate on the keywords
        for (let keyword of keywords) {
            // Check for stop the process
            if (!requests.get(requestId).processing) {
                break outer;
            }
            try {
                // New search attempt
                attempt++;
                sendMessage(`--------------------------------------------------`, requestId);
                sendMessage(`Attempt number ${attempt} to search for the keyword ${keyword} has started.`, requestId);
                if (attempt % 5 === 0) {
                    // Relaunch the browser
                    await browser.close();
                    ({ browser, page, proxyResult } = await openBrowser(proxy));
                    sendMessage(proxyResult, requestId);
                    cookieSet = false;
                    sendMessage(`Browser has been relaunched to avoid detection of fake searches.`, requestId);
                }
                // Navigate to Google.com
                await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 60000 });
                sendMessage(`Navigated to Google homepage and ready to search for the keyword.`, requestId);
                // Looking for the search box
                let selector = 'textarea[name="q"]';
                await page.waitForSelector(selector, { visible: true, timeout: 15000 });
                // Accept cookies
                if (!cookieSet) {
                    const cookies = await page.$('button#L2AGLb');
                    if (cookies) {
                        await cookies.click();
                        cookieSet = true;
                        sendMessage(`Cookies detected, attempting to accept them.`, requestId);
                    }
                }
                // Type the keyword in the search box
                const inputValue = await page.$eval(selector, el => el.value);
                if (inputValue === '') {
                    await page.type(selector, keyword, { delay: 100 });
                    sendMessage(`Search term is being entered into the search bar.`, requestId);
                }
                // ---Simulate human interaction---
                {
                    // Mouse move simulation
                    await page.mouse.move(100, 100);
                    await page.mouse.move(200, 200, { steps: 10 });
                    // Keyboard pressed simulation
                    await page.keyboard.press('ArrowDown');
                    await page.keyboard.press('ArrowUp');
                }
                await page.keyboard.press('Enter');
                await page.waitForNavigation();
                // ---Captcha detecting process---
                {
                    const captchaDetected = await page.evaluate(() => {
                        return document.querySelector('iframe[src*="recaptcha"]') !== null;
                    });
                    if (captchaDetected) {
                        sendMessage(`CAPTCHA detected. Attempting to solve it.`, requestId);
                        // Try solve the CAPTCHA
                        await page.waitForSelector('.captcha-solver');
                        await page.click('.captcha-solver');
                        await page.waitForSelector(`.captcha-solver[data-state="solved"]`, { timeout: 180000 });
                        await page.click("button[type='submit']");
                        sendMessage(`CAPTCHA should be solved now. Attempting to continue the process.`, requestId);
                    }
                }
                sendMessage(`Successfully navigated to the search results page.`, requestId);
                // ---Simulate human interaction---
                {
                    await page.evaluate(async () => {
                        // Scroll down
                        window.scrollBy(0, window.innerHeight);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        // Scroll up
                        window.scrollBy(0, -window.innerHeight);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    });
                }
                // Detecting links including the specific url
                const links = await page.$$eval('a', (anchors, url) => {
                    return anchors
                        .filter(a => a.href.includes(url))
                        .map(a => a.href);
                }, url);
                if (links.length > 0) {
                    await page.goto(links[0], { waitUntil: 'networkidle2', timeout: 60000 });
                    sendMessage(`Target link ${links[0]} detected and successfully navigated to.`, requestId);
                }
                // Wait in the page for between 1 and 5 seconds
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 4000) + 1000));
                sendMessage(`Visit completed successfully. Moving on to search for the next keyword.`, requestId);
            } catch (e) {
                sendMessage(`An issue occurred during the recent search. Attempting to resume.`, requestId);
            }
        }
        sendMessage(`All keywords have been searched once. Moving on to the next round.`, requestId);
    }
    if (browser) {
        await browser.close();
    }
    console.log(`Process ${requestId} stopped.`);
    requests.delete(requestId);
}

module.exports = { startScraping, stopScraping, updateStatus };