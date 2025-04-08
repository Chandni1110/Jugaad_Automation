const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const xlsx = require('xlsx');

(async function runTest() {
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();

    try {
        // ✅  Step 1: Open & Login to Main Stage
        await driver.manage().window().maximize();
        console.log("🚀 Opening Main Stage website...");
        await driver.get("https://main.stage-smartflow.com/m_user_login/agency/2/sign_in");
        await loginToMainStage(driver);
        await navigateToRecord(driver); // ✅ Navigate to the form
        let mainStageData = await extractFormData(driver, "Main Stage");

        // Step 2: Open a new browser window for Production
        console.log("🚀 Opening Production website in a new browser window...");
        newDriver = await new Builder().forBrowser('chrome').build();  // Create a new browser window instance
        await newDriver.get('https://production-website.com');  // Open the production website in the new browser window

        // Wait for the production website to load
        await newDriver.wait(until.elementLocated(By.tagName('body')), 10000); // Adjust this to suit the page load

        // ✅ Step 3: Open & Login to Production
        await driver.get("https://auth.vebuin.com/auth/realms/smartflow/protocol/openid-connect/auth?client_id=smartflow_public&redirect_uri=https%3A%2F%2Fsmartflow.vebuin.com%2Fm_user_login%2Fagency%2F3%2Fsign_in%3Fclear");
        await loginToProduction(driver);
        await navigateToRecord(driver); // ✅ Navigate to the form
        let productionData = await extractFormData(driver, "Production");

        // ✅ Step 4: Compare Data from Both Websites
        let comparisonResults = compareData(mainStageData, productionData);

        // ✅ Step 5: Export Data to Excel
        exportToExcel(mainStageData, productionData, comparisonResults);
        console.log("✅ Comparison results saved to Excel!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await driver.quit();
    }

})();

// ✅ Function to Login to Main Stage
async function loginToMainStage(driver) {
   // console.log("🔑 Logging into Main Stage...");
    await driver.wait(until.elementLocated(By.name('username')), 10000);
    let usernameField = await driver.findElement(By.name('username'));
    await usernameField.clear();
    await usernameField.sendKeys('yamamoto_m@yopmail.com');

    let passwordField = await driver.findElement(By.name('password'));
    await passwordField.clear();
    await passwordField.sendKeys('d2Ak5CMT1DNC41!');

    await driver.findElement(By.className('submit')).click();
    await driver.wait(until.urlContains('dashboard'), 10000);
    console.log("🔑 Logged in to Main Stage!");
}

// ✅ Function to Login to Production
async function loginToProduction(driver) {
   // console.log("🔑 Logging into Production...");
    await driver.wait(until.elementLocated(By.id('username')), 10000);
    let usernameField = await driver.findElement(By.id('username'));
    await usernameField.clear();
    await usernameField.sendKeys('chandni_pro_1@yopmail.com');

    let passwordField = await driver.findElement(By.id('password'));
    await passwordField.clear();
    await passwordField.sendKeys('123123123');

    // ✅ Updated Login Button Selector
    let loginButton = await driver.wait(until.elementLocated(By.className("submit")), 10000);
    await driver.executeScript("arguments[0].click();", loginButton);
    await driver.sleep(5000);
    console.log("🔑 Logged in to Production!");
}

// ✅ Function to Navigate to the Form (Both Websites)
async function navigateToRecord(driver) {
    //console.log("📌 Navigating to All Items...");

    let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
    await driver.wait(until.elementIsVisible(element), 5000);
    await driver.executeScript('arguments[0].scrollIntoView(true);', element);
    await driver.sleep(1000);

    if (await element.isEnabled()) {
        await driver.executeScript('arguments[0].click();', element);
        console.log('📌 Navigated to All Items');
    } else {
        console.warn('❌ Element is not clickable.');
    }
    await driver.sleep(2000);
    
    // ✅ Click the "Approved" tab
    let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="完了"]')), 10000);
    await driver.executeScript('arguments[0].click();', elementApproved);
    console.log('✅ Approved tab clicked');

    await driver.sleep(3000);

// ✅ Extract form data
async function extractFormData(driver) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set(); // To track unique label-value pairs
        const radioGroups = new Map(); // ✅ Defined inside script scope

        // Get all form elements in the correct order
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


           // ✅ Extract Checkbox Values
            if (input.type === "checkbox") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";

                if (groupLabel) { // ✅ Skip if no group label is found
                    value = input.checked ? "Checked" : "Unchecked";

                    if (!seen.has(groupLabel + value)) {
                        result.push({ label: groupLabel, value });
                        seen.add(groupLabel + value);
                    }
                }
            }

          // ✅ Extract Selected and Not Selected Radio Button Values
            else if (input.type === "radio") {
                let groupLabelElement = input.closest('.col-md-12')?.querySelector('label.jd-label');
                let groupLabel = groupLabelElement ? groupLabelElement.innerText.trim() : "";

                if (groupLabel) { // ✅ Skip if no group label is found
                    if (!radioGroups.has(input.name)) {
                        document.querySelectorAll(`input[name="${input.name}"]`).forEach(radio => {
                            let optionLabel = radio.parentElement?.textContent.trim() || radio.value.trim() || "No Option Label";
                            let value = radio.checked 
                                ? `Selected: ${optionLabel}` 
                                : `Not Selected: ${optionLabel}`;

                            if (!seen.has(groupLabel + value)) {
                                result.push({ label: groupLabel, value });
                                seen.add(groupLabel + value);
                            }
                        });

                        radioGroups.set(input.name, true);
                    }
                }
            }

            // ✅ Extract Text Inputs, Textareas, Selects
            else if (input.tagName === "SELECT") {
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

// Unified function to process both Main Stage and Production applications
async function processApplicationsAndExtractData(driver, applicationNumbers) {
    // Arrays to store the extracted data for later comparison
    let mainStageData = [];
    let productionData = [];

    for (let appNumber of applicationNumbers) {
        console.log(`🔍 Searching for application: ${appNumber}`);

        // Perform search for both Main Stage and Production
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

        // Click the first search result and open it in a new tab
        let firstResult = await driver.wait(
            until.elementLocated(By.css("table.table tbody tr:first-child td:nth-child(4) div div.d-flex.align-items-center")),
            10000
        );

        await driver.actions().keyDown(Key.CONTROL).click(firstResult).keyUp(Key.CONTROL).perform();
        console.log(`✅ Clicked on the searched application: ${appNumber} (Opening in new tab)`);

        // Switch to new tab and process the application
        await driver.sleep(5000);
        let tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[tabs.length - 1]);
        console.log(`✅ Switched to new tab for application: ${appNumber}`);

        await driver.sleep(5000);

        // Wait for form to load
        await driver.wait(until.elementLocated(By.id("requestform")), 5000);
        console.log("✅ Form loaded successfully");

        // Extract data for both Main Stage and Production in the same iteration
        let valuesAndLabelsMainStage;
        let valuesAndLabelsProduction;

        // Extract Main Stage data using your existing extractFormData function
        valuesAndLabelsMainStage = await extractFormData(driver); // Extract data for Main Stage
        console.log(`📌 Main Stage Extracted Data for ${appNumber}:`, valuesAndLabelsMainStage);

        // Here, if the Production form is on the same page or in the same tab, we can extract Production data sequentially
        // If it's a different tab or form section, we can switch or click accordingly

        // Assuming a switch to the "Production" section/tab (if it's in the same tab, replace this with the actual selector)
        await driver.findElement(By.css('button#production-tab')).click(); // Example: Change selector accordingly
        console.log("✅ Switched to Production section");

        // Wait for the production form to load
        await driver.wait(until.elementLocated(By.id("productionRequestForm")), 5000); // Replace with actual selector for production form
        console.log("✅ Production Form loaded successfully");

        // Extract Production data using your existing extractFormData function
        valuesAndLabelsProduction = await extractFormData(driver); // Extract data for Production
        console.log(`📌 Production Extracted Data for ${appNumber}:`, valuesAndLabelsProduction);

        // Store data for later comparison
        mainStageData.push({ applicationNumber: appNumber, data: valuesAndLabelsMainStage });
        productionData.push({ applicationNumber: appNumber, data: valuesAndLabelsProduction });

        // Close the current tab and return to the main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);  // Switch back to the main stage tab
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }

    // Return the data after processing all applications
    return { mainStageData, productionData };
}

// Example Usage:
let applicationNumbers = ["0155", "0156"];
let { mainStageData, productionData } = await processApplicationsAndExtractData(driver, applicationNumbers);
}