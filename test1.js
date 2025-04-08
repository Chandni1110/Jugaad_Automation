const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runMainStage() {
    let options = new chrome.Options();
    options.addArguments("--profile-directory=Profile 1"); // Use a separate profile

    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    try {
        await driver.manage().window().maximize();
        await driver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in');
        await driver.sleep(2000);
        console.log("🔵 Main Stage Browser Launched!");
        
        // Perform operations in the main stage...
        // Login
        console.log("🔑 Logging in...");
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
        console.log("✅ Login successful!");

        // Click on "All Items" link
        let retries = 3;
        while (retries > 0) {
            try {
                let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
                await driver.wait(until.elementIsVisible(element), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', element);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', element);
                console.log("📌 Navigated to All Items");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate and click "All Items"... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Click on "Approved" tab
        retries = 3;
        while (retries > 0) {
            try {
                let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="完了"]')), 10000);
                await driver.wait(until.elementIsVisible(elementApproved), 5000);
                await driver.executeScript('arguments[0].scrollIntoView(true);', elementApproved);
                await driver.sleep(1000);
                await driver.executeScript('arguments[0].click();', elementApproved);
                console.log("✅ Approved tab clicked successfully!");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate and click "Approved" tab... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

        await driver.sleep(2000);

        // Locate table
        retries = 3;
        while (retries > 0) {
            try {
                let table = await driver.wait(until.elementLocated(By.css('table.table')), 10000);
                await driver.wait(until.elementIsVisible(table), 5000);
                console.log("✅ Table is visible.");
                break;
            } catch (error) {
                if (retries === 1) throw error;
                console.warn(`Retrying to locate table... Attempts left: ${retries - 1}`);
                await driver.sleep(2000);
                retries--;
            }
        }

async function processApplicationsAndDownloadFiles(driver, applicationNumbers, formData) {
    // Loop over each application number
    for (let appNumber of applicationNumbers) {
        console.log(`🔍 Searching for application: ${appNumber}`);

        // Perform search
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

        // Extract form data
        let valuesAndLabels = await extractFormData(driver); // Store the extracted data
        console.log(`📌 Extracted Data for application ${appNumber}:`, valuesAndLabels);

        // Add the appNumber to each extracted result before pushing it into the formData array
        let appData = valuesAndLabels.map(item => ({ ...item, appNumber }));
        console.log(`📦 Pushing data for application ${appNumber}:`, appData);

        // Push extracted data to formData array with the application number
        formData.push(...appData);

        // Close the current tab and return to the main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}

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
