const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');

// Define the browser type
let browser = "chrome"; // Change to "firefox" or "edge" as needed

let driver;
let prodDriver; // Driver for Production environment

(async function runTest() {
    try {
        // Open the browser for Main Stage
        if (browser === "chrome") {
            driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();
        } else if (browser === "firefox") {
            driver = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options()).build();
        } else if (browser === "edge") {
            driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(new edge.Options()).build();
        } else {
            throw new Error("Invalid browser selection!");
        }

        await driver.manage().window().maximize();

        // --- Main Stage Steps ---
        await driver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in');
        await driver.sleep(2000);

        // Login to Main Stage
        console.log("🔑 Logging in to Main Stage...");
        await driver.wait(until.elementLocated(By.name('username')), 10000);
        let inputField = await driver.findElement(By.name('username'));
        await inputField.clear();
        await inputField.sendKeys('yamamoto_m@yopmail.com');

        await driver.wait(until.elementLocated(By.name('password')), 10000);
        let passwordField = await driver.findElement(By.name('password'));
        await passwordField.clear();
        await passwordField.sendKeys('d2Ak5CMT1DNC41!');

        await driver.findElement(By.className('submit')).click();
        await driver.wait(until.urlContains('dashboard'), 15000);
        console.log("✅ Login to Main Stage successful!");

        // Main Stage actions (e.g., navigating and extracting data)
        // Existing Main Stage logic here...
        let applicationNumbers = ["0155", "0156"];
        await processApplicationsAndDownloadFiles(driver, applicationNumbers);
        console.log("📦 Main Stage Data Extracted!");

        // --- Now Open a New Browser for Production ---
        console.log("🚀 Opening new browser for Production...");
        prodDriver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();
        await prodDriver.manage().window().maximize();

        // Navigate to the Production environment
        await prodDriver.get('https://main.smartflow.com/m_user_login/agency/2/sign_in'); // Production URL
        await prodDriver.sleep(2000);

        // Login to Production
        console.log("🔑 Logging in to Production...");
        await prodDriver.wait(until.elementLocated(By.name('username')), 10000);
        let prodInputField = await prodDriver.findElement(By.name('username'));
        await prodInputField.clear();
        await prodInputField.sendKeys('prod_user@example.com'); // Replace with your production credentials

        await prodDriver.wait(until.elementLocated(By.name('password')), 10000);
        let prodPasswordField = await prodDriver.findElement(By.name('password'));
        await prodPasswordField.clear();
        await prodPasswordField.sendKeys('prod_password'); // Replace with your production password

        await prodDriver.findElement(By.className('submit')).click();
        await prodDriver.wait(until.urlContains('dashboard'), 15000);
        console.log("✅ Login to Production successful!");

        // Production actions (e.g., navigating and extracting data)
        // Implement similar logic to Main Stage for Production environment

        // Example: Extracting form data in Production
        let prodApplicationNumbers = ["0155", "0156"];
        await processApplicationsAndDownloadFiles(prodDriver, prodApplicationNumbers);
        console.log("📦 Production Data Extracted!");

    } catch (error) {
        console.error("❌ An error occurred:", error);
    } finally {
        if (driver) {
            // Close the Main Stage browser
            await driver.quit();
            console.log("🚪 Main Stage Browser closed.");
        }
        if (prodDriver) {
            // Close the Production browser
            await prodDriver.quit();
            console.log("🚪 Production Browser closed.");
        }
    }
})();

// Your existing processApplicationsAndDownloadFiles function remains the same
async function processApplicationsAndDownloadFiles(driver, applicationNumbers) {
    for (let appNumber of applicationNumbers) {
        console.log(`🔍 Searching for application: ${appNumber}`);
        let searchBox = await driver.findElement(By.css("div.sf-panel-heading.ng-scope input[ng-model='query']"));
        await searchBox.clear();
        await searchBox.sendKeys(appNumber);
        await driver.sleep(5000);

        let results = await driver.wait(
            until.elementsLocated(By.css("table.table tbody tr")),
            10000
        );

        if (results.length === 0) {
            console.log(`❌ No search results found for ${appNumber}!`);
            continue;
        }

        let firstResult = await driver.wait(
            until.elementLocated(By.css("table.table tbody tr:first-child td:nth-child(4) div div.d-flex.align-items-center")),
            10000
        );

        await driver.actions().keyDown(Key.CONTROL).click(firstResult).keyUp(Key.CONTROL).perform();
        console.log(`✅ Clicked on the searched application: ${appNumber} (Opening in new tab)`);

        await driver.sleep(5000);
        let tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[tabs.length - 1]);
        console.log(`✅ Switched to new tab for application: ${appNumber}`);

        await driver.sleep(5000);

        await driver.wait(until.elementLocated(By.id("requestform")), 5000);
        console.log("✅ Form loaded successfully");

        let valuesAndLabels = await extractFormData(driver); // Store the extracted data
        console.log(`📌 Extracted Data for Application: ${appNumber}`, valuesAndLabels);

        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}

// Your existing extractFormData function remains the same
async function extractFormData(driver) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set(); // To track unique label-value pairs
        const radioGroups = new Map(); // Defined inside script scope

        const formElements = document.querySelectorAll('input.form-control, textarea.form-control, select.form-control, input[type="checkbox"], input[type="radio"]');

        formElements.forEach(input => {
            let label = 'No label';
            const labelFor = document.querySelector(`label[for="${input.id}"]`);
            if (labelFor) {
                label = labelFor.textContent.trim();
            } else {
                const closestLabel = input.closest('label');
                if (closestLabel) {
                    label = closestLabel.textContent.trim();
                } else {
                    const previousSibling = input.previousElementSibling;
                    if (previousSibling && previousSibling.tagName === 'LABEL') {
                        label = previousSibling.textContent.trim();
                    }
                }
            }

            if (label === 'No label') {
                const placeholder = input.getAttribute('placeholder');
                if (placeholder) {
                    label = placeholder.trim();
                }
            }

            let value = "No value";
            if (input.type === "checkbox") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";
                if (groupLabel) {
                    value = input.checked ? "Checked" : "Unchecked";
                    if (!seen.has(groupLabel + value)) {
                        result.push({ label: groupLabel, value });
                        seen.add(groupLabel + value);
                    }
                }
            } else if (input.type === "radio") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";
                if (groupLabel) {
                    if (!radioGroups.has(input.name)) {
                        document.querySelectorAll(`input[name="${input.name}"]`).forEach(radio => {
                            let optionLabel = radio.parentElement?.textContent.trim() || radio.value.trim() || "No Option Label";
                            let value = radio.checked ? `Selected: ${optionLabel}` : `Not Selected: ${optionLabel}`;
                            if (!seen.has(groupLabel + value)) {
                                result.push({ label: groupLabel, value });
                                seen.add(groupLabel + value);
                            }
                        });
                        radioGroups.set(input.name, true);
                    }
                }
            } else if (input.tagName === "SELECT") {
                value = input.options[input.selectedIndex]?.text.trim() || "No value";
            } else {
                value = input.value.trim() || "No value";
            }

            if (label === 'No label' || value === 'No value') return;
            if (seen.has(label + value)) return;

            result.push({ label, value });
            seen.add(label + value);
        });

        return result;
    });

    return valuesAndLabels;
}
