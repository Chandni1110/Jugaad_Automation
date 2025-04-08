const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

(async function runTest() {
    let driver, newDriver;

    try {
        // STEP 1: MAIN STAGE ENVIRONMENT
        driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();
        await driver.manage().window().maximize();
        console.log("🚀 Opening Main Stage website...");
        await driver.get("https://main.stage-smartflow.com/m_user_login/agency/2/sign_in");

        await loginToMainStage(driver);
        const mainAppNumbers = await goToApprovedTab(driver, "Main Stage");  // Should return a list of application numbers

        for (const appNumber of mainAppNumbers) {
            console.log(`📥 Extracting Main Stage data for ${appNumber}`);
            const mainStageData = await extractFormData(driver, "Main Stage", appNumber);

            console.log(`💾 Saving Main Stage data for ${appNumber}`);
            await saveAndCompare(appNumber, "Main Stage", mainStageData); // This saves, compares, and exports if Production data exists
        }

        // STEP 2: PRODUCTION ENVIRONMENT
        newDriver = await new Builder().forBrowser('chrome').build();
        await newDriver.manage().window().maximize();
        console.log("🚀 Opening Production website...");
        await newDriver.get('https://main.stage-smartflow.com/m_user_login/agency/2/sign_in'); // <- Use correct Prod URL

        await newDriver.wait(until.elementLocated(By.tagName('body')), 10000);
        await loginToProduction(newDriver);
        const prodAppNumbers = await goToApprovedTab(newDriver, "Production"); // Should return list of application numbers

        for (const appNumber of prodAppNumbers) {
            console.log(`📥 Extracting Production data for ${appNumber}`);
            const prodData = await extractFormData(newDriver, "Production", appNumber);

            console.log(`💾 Saving Production data for ${appNumber}`);
            await saveAndCompare(appNumber, "Production", prodData); // This saves, compares, and exports if Main Stage data exists
        }

    } catch (err) {
        console.error("❌ Error in runTest:", err);
    } finally {
        if (driver) await driver.quit();
        if (newDriver) await newDriver.quit();
    }
})();

async function loginToMainStage(driver) {
    console.log("🔑 Logging into Main Stage...");
    await driver.wait(until.elementLocated(By.name('username')), 10000);
    let usernameField = await driver.findElement(By.name('username'));
    await usernameField.clear();
    await usernameField.sendKeys('yamamoto_m@yopmail.com');
    let passwordField = await driver.findElement(By.name('password'));
    await passwordField.clear();
    await passwordField.sendKeys('d2Ak5CMT1DNC41!');
    await driver.findElement(By.className('submit')).click();
    await driver.wait(until.urlContains('dashboard'), 10000);
    console.log("✅ Logged in to Main Stage!");
}

async function loginToProduction(driver) {
    console.log("🔑 Logging into Production...");
    await driver.wait(until.elementLocated(By.id('username')), 10000);
    let usernameField = await driver.findElement(By.id('username'));
    await usernameField.clear();
    await usernameField.sendKeys('yamamoto_m@yopmail.com');
    let passwordField = await driver.findElement(By.id('password'));
    await passwordField.clear();
    await passwordField.sendKeys('d2Ak5CMT1DNC41!');
    let loginButton = await driver.wait(until.elementLocated(By.className("submit")), 10000);
    await driver.executeScript("arguments[0].click();", loginButton);
    await driver.sleep(5000);
    console.log("✅ Logged in to Production!");
}

// Click on "All Items" & "Approved Tab" link
async function goToApprovedTab(driver, websiteName) {
    console.log(`📌 Navigating to All Items on ${websiteName}...`);
    let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
    await driver.wait(until.elementIsVisible(element), 5000);
    await driver.executeScript('arguments[0].scrollIntoView(true);', element);
    await driver.sleep(1000);
    await driver.executeScript('arguments[0].click();', element);
    console.log(`✅ Navigated to All Items on ${websiteName}`);
    
    try {
        let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="完了"]')), 15000);
        await driver.wait(until.elementIsVisible(elementApproved), 5000);  // Ensure visibility
        await driver.executeScript('arguments[0].click();', elementApproved);
        console.log(`✅ Approved tab clicked on ${websiteName}`);
    } catch (error) {
        console.warn(`⚠️ Approved tab not found on ${websiteName}.`);
    }
    await driver.sleep(3000);

    let applicationNumbers = ["0155", "0156"];  // You can modify the application numbers as needed
    let formData = [];

    // Process applications and download the data
    await processApplicationsAndDownloadFiles(driver, applicationNumbers, websiteName);

    return formData;
}


// Application Numbers and Data Storage
async function processApplicationsAndDownloadFiles(driver, applicationNumbers, websiteName) {
    // ✅ Ensure output folder exists
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

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
        let formData = await extractFormData(driver, websiteName, appNumber);
        await saveAndCompare(appNumber, websiteName, formData);
        console.log(`📌 Extracted Data: ${websiteName} ${appNumber}`, formData);

        // Save and compare logic
        await saveAndCompare(appNumber, websiteName, formData);

        // Close the current tab and return to the main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}
    


// ✅ Extract form data
async function extractFormData(driver, websiteName, appNumber) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set();
        const radioGroups = new Map();

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

                if (groupLabel && !radioGroups.has(input.name)) {
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
            } else if (input.tagName === "SELECT") {
                value = input.options[input.selectedIndex]?.text.trim() || "No value";
            } else {
                value = input.value.trim() || "No value";
            }

            if (label !== 'No label' && value !== 'No value' && !seen.has(label + value)) {
                result.push({ label, value });
                seen.add(label + value);
            }
        });

        return result;
    });

//    console.log(`📌 ${websiteName} Extracted Data: ${appNumber}`, valuesAndLabels);
    return valuesAndLabels;
}


// Util: Save data to JSON file
function saveComparisonToFile(appNumber, mainData, prodData, comparisonResults) {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const filePath = path.join(outputDir, `${appNumber}.json`);

    const dataToSave = {
        "Main Stage Data": mainData,
        "Production Data": prodData,
        "Comparison Results": comparisonResults
    };

    fs.writeFileSync(filePath, JSON.stringify(combinedData, null, 2), 'utf8');
    console.log(`✅ Comparison saved to file: ${filePath}`);
}


// 🔍 Compare two sets of form data
function compareFormData(mainData, prodData) {
    const allLabels = new Set([
        ...mainData.map(item => item.label),
        ...prodData.map(item => item.label),
    ]);

    let results = [];

    for (let label of allLabels) {
        const entry1 = mainData.find(item => item.label === label);
        const entry2 = prodData.find(item => item.label === label);

        const label1 = entry1 ? entry1.label : "Not Found";
        const value1 = entry1 ? entry1.value : "Not Found";

        const label2 = entry2 ? entry2.label : "Not Found";
        const value2 = entry2 ? entry2.value : "Not Found";

        const labelMatch = label1 === label2 ? "✅ Matched" : "❌ Mismatch";
        const valueMatch = value1 === value2 ? "✅ Matched" : "❌ Mismatch";

        results.push({
            "Main Stage - Label": label1,
            "Main Stage - Value": value1,
            "Production - Label": label2,
            "Production - Value": value2,
            "Label Match": labelMatch,
            "Value Match": valueMatch
        });
    }

    return results;
}

// 📤 Export the data to Excel
function exportToExcel(appNumber, mainStageData, productionData, comparisonResults) {
    const wb = xlsx.utils.book_new();

    const ws1 = xlsx.utils.json_to_sheet(mainStageData);
    const ws2 = xlsx.utils.json_to_sheet(productionData);
    const ws3 = xlsx.utils.json_to_sheet(comparisonResults);

    xlsx.utils.book_append_sheet(wb, ws1, "Main Stage");
    xlsx.utils.book_append_sheet(wb, ws2, "Production");
    xlsx.utils.book_append_sheet(wb, ws3, "Comparison Results");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${appNumber}_comparison_${timestamp}.xlsx`;
    const outputDir = path.join(__dirname, 'output');
    const filePath = path.join(outputDir, fileName);

    try {
        xlsx.writeFile(wb, filePath);
        console.log(`✅ Comparison results saved to Excel!`);
        console.log(`📂 Excel file path: ${filePath}`);
    } catch (error) {
        console.error(`❌ Failed to save Excel file:`, error);
    }
}

// 💾 Save data and trigger comparison if both sides are present
async function saveAndCompare(appNumber, websiteName, formData) {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const jsonPath = path.join(outputDir, `${appNumber}.json`);
    let combinedData = {};

    // Load existing JSON if exists
    if (fs.existsSync(jsonPath)) {
        combinedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    // Add current environment's data
    combinedData[websiteName] = formData;

    // Save updated JSON
    fs.writeFileSync(jsonPath, JSON.stringify(combinedData, null, 2), 'utf8');
    console.log(`💾 Saved ${websiteName} data for ${appNumber} to JSON`);

    // Compare & export only if both environments are present
    if (combinedData["Main Stage"] && combinedData["Production"]) {
        const mainStageData = combinedData["Main Stage"];
        const productionData = combinedData["Production"];
        const comparisonResults = compareFormData(mainStageData, productionData);

        exportToExcel(appNumber, mainStageData, productionData, comparisonResults);
    }
        console.log(`🔧 Running saveAndCompare for App #${appNumber} from ${websiteName}`);

}

module.exports = { saveAndCompare };



