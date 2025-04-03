const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');

// Define the browser type
let browser = "chrome"; // Change to "firefox" or "edge" as needed

let driver;
let mainStageData = [];

async function runMainStage() {
    try {
        // Open the browser
        if (browser === "chrome") {
            let options = new chrome.Options();
            options.addArguments("--profile-directory=Profile 1"); // Use Profile 1 for Chrome
            driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
        } else if (browser === "firefox") {
            driver = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options()).build();
        } else if (browser === "edge") {
            driver = await new Builder().forBrowser('MicrosoftEdge').setEdgeOptions(new edge.Options()).build();
        } else {
            throw new Error("Invalid browser selection!");
        }

        await driver.manage().window().maximize();

        // Navigate to the login page
        await driver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in');
        await driver.sleep(2000);
        console.log("🔵 Main Stage Browser Launched!");

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

        // Application Numbers and Data Storage
        let applicationNumbers = ["0155", "0156"]; // Modify as needed
        let formData = [];

        // ✅ Process Applications & Extract Data
        await processApplicationsAndDownloadFiles(driver, applicationNumbers);

      //  console.log("📦 Main_Stage Final extracted data:", formData);

    } catch (error) {
        console.error("❌ An error occurred:", error);
    } finally {
        if (driver) {
            await driver.quit();
            console.log("🚪 Browser closed.");
        }
    }
};

async function processApplicationsAndDownloadFiles(driver, applicationNumbers) {
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

        // Log the extracted data in the desired format
        console.log(`📌 Main Stage Extracted Data:  ['${appNumber}']`, valuesAndLabels);

        // Removed saveFormDataToFile function call
        // Close the current tab and return to the main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}


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

//    console.log("📌 Extracted Data:", valuesAndLabels);
    return valuesAndLabels;
}


//===================Do Not Change Above===========================

// Production logic function
async function runProduction() {
    let options = new chrome.Options();
    options.addArguments("--profile-directory=Profile 2"); // Use another profile

    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    let formData = []; // Declare formData at the beginning of the function to keep track of the data

    try {
        await driver.manage().window().maximize();
        await driver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in');
        await driver.sleep(2000);
        console.log("🟢 Production Browser Launched!");
        
        // Perform login
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

        // Application Numbers and Data Storage
        let applicationNumbers = ["0155", "0156"]; // Modify as needed

        // ✅ Process Applications & Extract Data
        await processApplicationsAndDownloadFiles(driver, applicationNumbers);

  //      console.log("📦 Production Final extracted data:", formData);

    } catch (error) {
        console.error("❌ An error occurred:", error);
    } finally {
        if (driver) {
            await driver.quit();
            console.log("🚪 Browser closed.");
        }
    }
}

// Process Applications & Download Files
async function processApplicationsAndDownloadFiles(driver, applicationNumbers) {
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

        // Log the extracted data in the desired format
        console.log(`📌 Production Extracted Data:  ['${appNumber}']`, valuesAndLabels);

        // Close the current tab and return to the main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}

// Extract form data
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

//===========================Do Not Change In Above Code==========================

// Assuming you already have the extracted data for both main stage and production (like `mainStageData` and `productionData`)

// Placeholder for storing comparison results
let comparisonResults = [];

// Compare data function
async function compareData(mainStageData, productionData) {
    // Loop through all items in the mainStageData (assuming both datasets have the same length)
    for (let i = 0; i < mainStageData.length; i++) {
        // Get main stage entry
        let entry1 = mainStageData[i];
        // Get production entry
        let entry2 = productionData[i];

        // Compare labels and values, using fallback if not found
        let label1 = entry1 ? entry1.label : "Not Found";
        let label2 = entry2 ? entry2.label : "Not Found";

        let labelMatch = label1 === label2 ? "✅ Matched" : "❌ Mismatch";

        let value1 = entry1 ? entry1.value : "Not Found";
        let value2 = entry2 ? entry2.value : "Not Found";

        let valueMatch = value1 === value2 ? "✅ Matched" : "❌ Mismatch";

        // Push the result into the comparisonResults array
        comparisonResults.push({
            "Main Stage - Label": label1,
            "Main Stage - Value": value1,
            "Production - Label": label2,
            "Production - Value": value2,
            "Label Match": labelMatch,
            "Value Match": valueMatch
        });
    }

    // Once comparison is done, output the results (for example, printing to console)
    console.log("Comparison Results:", comparisonResults);
}

// // Perform the comparison
// compareData(runMainStage, runProduction);

// Sequentially run Main Stage and Production automation
(async function run() {
    await runMainStage();  // First, execute the Main Stage code
    await runProduction();  // Then, execute the Production code
    await compareData(runMainStage, runProduction); 
    //await comparisonResults(); // Then, execute the Comparison code
})();
