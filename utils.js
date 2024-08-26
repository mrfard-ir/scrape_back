// Libraries
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { executablePath, timeout } = require('puppeteer');
const path = require('path');
// Constants
const userAgents = require('./userAgents');
const VEEPN_EXTENSION_ID = 'majdfhpaihoncoakbjgbdhglocklcgno';

const handleUnwantedTab = (browser, unwantedUrl) => {
    return async (target) => {
        try {
            if (target.type() === 'page') {
                const newPage = await target.page();
                await newPage.waitForNavigation();
                const openedTabUrl = newPage.url();
                if (openedTabUrl.includes(unwantedUrl)) {
                    await newPage.close();
                    browser.off('targetcreated');
                }
            }
        } catch (e) {
            console.log(`Something went wrong on handling the new tabs: ${e}`);
        }
    };
}

const connectProxy = async (browser) => {
    // Add listener for new tabs
    browser.on('targetcreated', handleUnwantedTab(browser, "https://veepn.com/welcome"));
    let result = "";
    try {
        // Navigate to the extension page
        const extension = await browser.newPage();
        await extension.goto(`chrome-extension://${VEEPN_EXTENSION_ID}/src/popup/popup.html`);
        for (let i = 0; i < 2; i++) {
            const stepBtn = await extension.waitForSelector('button[class="intro-steps__btn"]', { visible: true, timeout: 15000 });
            stepBtn.click();
        }
        // Change the region
        const regionBtn = await extension.waitForSelector('button[class="connect-region__location"]', { visible: true, timeout: 15000 });
        regionBtn.click();
        // Select a region
        await extension.waitForSelector('div.location-section__wrap', { visible: true, timeout: 15000 });
        await extension.evaluate(() => {
            // Finding the regions div
            const regions = document.querySelector('div.location-section__wrap');
            if (regions) {
                // Finding all radio spans
                const spans = regions.querySelectorAll('span.location-country__radio');
                if (spans.length > 0) {
                    // Choosing the region
                    const firstSpan = spans[Math.floor(Math.random() * spans.length)];
                    firstSpan.scrollIntoView();
                    firstSpan.click();
                } else {
                    throw new Error();
                }
            } else {
                throw new Error();
            }
        });
        // Connect to the proxy and wait for connection
        const connectBtn = await extension.waitForSelector('button[aria-label="connection button"]', { visible: true, timeout: 15000 });
        connectBtn.click();
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 10000));
        await extension.close();
        // Get ip address
        const ip = await browser.newPage();
        await ip.goto('https://httpbin.org/ip');
        const ipAddress = await ip.evaluate(() => {
            const preElement = document.querySelector('pre');
            const jsonData = preElement ? JSON.parse(preElement.innerText) : null;
            return jsonData ? jsonData.origin : null;
        });
        await ip.close();
        result = `Proxy connected successfully. IP: ${ipAddress}`;
    } catch (e) {
        result = `Something went wrong during proxy connection: ${e}`;
    }
    return result;
}

async function openBrowser(proxy) {
    // Define constants
    const pathTo2Captcha = path.resolve(__dirname, 'extensions/2captcha-solver');
    const pathToVeepn = path.resolve(__dirname, `extensions/${VEEPN_EXTENSION_ID}/3.0.4_0`);
    // Define the base arguments
    const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
    ];
    // Add proxy-related arguments based on whether proxy is enabled
    const additionalArgs = proxy
        ? [
            `--disable-extensions-except=${pathTo2Captcha},${pathToVeepn}`,
            `--load-extension=${pathTo2Captcha},${pathToVeepn}`
        ]
        : [
            `--disable-extensions-except=${pathTo2Captcha}`,
            `--load-extension=${pathTo2Captcha}`
        ];
    // Combine base arguments with additional arguments
    const args = [...baseArgs, ...additionalArgs];
    // Define the browser
    const browser = await puppeteer.launch({
        headless: true,
        args: args,
        executablePath: executablePath(),
    });
    // Connect to proxy
    const proxyResult = proxy
        ? await connectProxy(browser)
        : 'Proxy is disabled.';
    // Define the page
    const page = await browser.newPage();
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    return { browser, page, proxyResult };
}

module.exports = { openBrowser };