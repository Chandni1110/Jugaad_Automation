const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');

// Define the browser type
let browser = "chrome"; // Change this to "firefox" or "edge" if needed

let driver;

(async function runTest() {
    try {
        // Open browser based on the choice of browser
        if (browser === "chrome") {
            driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();
        } else if (browser === "firefox") {
            driver = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options()).build();
        } else if (browser === "edge") {
            driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(new edge.Options()).build();
        }

        // Maximize the browser window
        await driver.manage().window().maximize();

        // Navigate to the login page
        await driver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in');
        await driver.sleep(2000); // Wait for the page to load

        // Login
        await driver.wait(until.elementLocated(By.name('username')), 10000);
        let inputField = await driver.findElement(By.name('username'));
        await inputField.clear();
        await inputField.sendKeys('thinkbiz001+01@gmail.com');
        await driver.sleep(1000);

        await driver.wait(until.elementLocated(By.name('password')), 10000);
        let passwordField = await driver.findElement(By.name('password'));
        await passwordField.clear();
        await passwordField.sendKeys('123123123');
        await driver.sleep(1000);

        await driver.findElement(By.className('submit')).click();
        await driver.wait(until.urlContains('dashboard'), 10000);
        console.log('Login successful!');
        await driver.sleep(2000);

        // Click on "All Items" link
        let retries = 3;
        while (retries > 0) {
            try {
                let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
                await driver.wait(until.elementIsVisible(element), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', element);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', element);
                console.log('Navigated to All Items');
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.log(`Retrying to locate and click "All Items"... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Click on "Approved" tab
        retries = 3;
        while (retries > 0) {
            try {
                let elementApproved = await driver.wait(until.elementLocated(By.xpath('//li[@class="ng-scope active"]/a/span[text()="Approved"]')), 10000);
                await driver.wait(until.elementIsVisible(elementApproved), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', elementApproved);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', elementApproved);
                console.log('Approved tab clicked successfully');
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.log(`Retrying to locate and click "Approved" tab... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Locate table and retry if stale
        retries = 3;
        let table;
        while (retries > 0) {
            try {
                table = await driver.wait(until.elementLocated(By.css('table.table')), 30000);
                await driver.wait(until.elementIsVisible(table), 30000);
                console.log('Table is visible');
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.log(`Retrying to locate table... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Locate and click the first record in the table
        retries = 3;
        while (retries > 0) {
            try {
                let anchor = await driver.wait(until.elementLocated(By.css('table.table tr:nth-child(1) td a')), 30000);
                await driver.wait(until.elementIsVisible(anchor), 20000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', anchor);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', anchor);
                console.log('Clicked the first record in the table');
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.log(`Retrying to locate and click first record... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(3000);

        // Locate the target div to fetch labels and values
        let targetDiv = await driver.wait(until.elementLocated(By.css('.jd-panel')), 10000);
        console.log('✅ Target Div Located!');
        await driver.wait(until.elementIsVisible(targetDiv), 5000);
        await driver.sleep(20000);

        // Extract unique labels and values
        let formElements = await driver.findElements(By.css('label'));
        let extractedData = [];

        for (let label of formElements) {
            let labelText = await label.getText();
            let value = "N/A";

            let associatedElement;
            try {
                associatedElement = await label.findElement(By.xpath("following-sibling::input | following-sibling::select | following-sibling::textarea"));
            } catch (e) {
                associatedElement = null;
            }

            if (associatedElement) {
                let tagName = await associatedElement.getTagName();
                let type = await associatedElement.getAttribute("type");

                if (tagName === "input") {
                    if (["checkbox", "radio"].includes(type)) {
                        let isChecked = await associatedElement.getAttribute("checked");
                        if (isChecked) {
                            value = `Checked Value: ${await associatedElement.getAttribute("value")}`;
                        }
                    } else {
                        value = await associatedElement.getAttribute("value") || "N/A";
                    }
                } else if (tagName === "select") {
                    let selectedOption = await associatedElement.findElement(By.css("option:checked"));
                    value = await selectedOption.getText() || "N/A";
                } else if (tagName === "textarea") {
                    value = await associatedElement.getAttribute("value") || "N/A";
                }
            }

            extractedData.push({ label: labelText, value: value });
        }

        // Print extracted labels and values correctly
        console.log("🔹 Unique Labels and Values:");
        extractedData.forEach(item => {
            console.log(`${item.label} = ${item.value}`);
        });

    } catch (error) {
        console.error('Error extracting form data:', error);
    } finally {
        await driver.quit();
    }
})();
