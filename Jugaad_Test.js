const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const xlsx = require('xlsx');
const fs = require('fs'); // Required for saving files locally

(async function runTest() {
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options()).build();

    try {
        await driver.manage().window().maximize();

        // Login to Main Stage
        console.log("🚀 Opening Main Stage website...");
        await driver.get("https://main.stage-smartflow.com/m_user_login/agency/2/sign_in");
        await loginToMainStage(driver);

        // Go to Approved Tab on Main Stage
        let mainStageData = await goToApprovedTab(driver, "Main Stage");

        // Login to Production
        console.log("🚀 Opening Production website...");
        await driver.executeScript("window.open('about:blank', '_blank');");
        let tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[1]);
        await driver.get("https://auth.vebuin.com/auth/realms/smartflow/protocol/openid-connect/auth?client_id=smartflow_public&redirect_uri=https%3A%2F%2Fsmartflow.vebuin.com%2Fm_user_login%2Fagency%2F3%2Fsign_in%3Fclear");
        await loginToProduction(driver);

        // Go to Approved Tab on Production
        let productionData = await goToApprovedTab(driver, "Production");

        // Compare data
        let applicationNumbers = ["0001", "0002"]; // Adjust with the app numbers you are comparing
        for (let appNumber of applicationNumbers) {
            let comparisonResults = compareData(mainStageData, productionData, appNumber);

            if (comparisonResults.length === 0) {
                console.warn("⚠️ No comparison results found.");
            }

            // Save comparison results to Excel file for each app number
            exportToExcel(mainStageData, productionData, comparisonResults, appNumber);
            console.log(`✅ Comparison results for application ${appNumber} saved to Excel!`);
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await driver.quit();
    }
})();

// Function to save data to an Excel file
function exportToExcel(mainStageData, productionData, comparisonResults, appNumber) {
    // Create a workbook
    let wb = xlsx.utils.book_new();

    // Create a worksheet with the mainStageData
    let wsMainStage = xlsx.utils.json_to_sheet(mainStageData);
    xlsx.utils.book_append_sheet(wb, wsMainStage, `Main Stage Data`);

    // Create a worksheet with the productionData
    let wsProduction = xlsx.utils.json_to_sheet(productionData);
    xlsx.utils.book_append_sheet(wb, wsProduction, `Production Data`);

    // Create a worksheet with the comparison results
    let wsComparison = xlsx.utils.json_to_sheet(comparisonResults);
    xlsx.utils.book_append_sheet(wb, wsComparison, `Comparison Results`);

    // Write the Excel file to disk
    const fileName = `comparison_results_${appNumber}.xlsx`;
    xlsx.writeFile(wb, fileName);
}

async function loginToMainStage(driver) {
    console.log("🔑 Logging into Main Stage...");
    await driver.wait(until.elementLocated(By.name('username')), 10000);
    let usernameField = await driver.findElement(By.name('username'));
    await usernameField.clear();
    await usernameField.sendKeys('thinkbiz001+01@gmail.com');
    let passwordField = await driver.findElement(By.name('password'));
    await passwordField.clear();
    await passwordField.sendKeys('123123123');
    await driver.findElement(By.className('submit')).click();
    await driver.wait(until.urlContains('dashboard'), 10000);
    console.log("✅ Logged in to Main Stage!");
}

async function loginToProduction(driver) {
    console.log("🔑 Logging into Production...");
    await driver.wait(until.elementLocated(By.id('username')), 10000);
    let usernameField = await driver.findElement(By.id('username'));
    await usernameField.clear();
    await usernameField.sendKeys('chandni_pro_1@yopmail.com');
    let passwordField = await driver.findElement(By.id('password'));
    await passwordField.clear();
    await passwordField.sendKeys('123123123');
    let loginButton = await driver.wait(until.elementLocated(By.className("submit")), 10000);
    await driver.executeScript("arguments[0].click();", loginButton);
    await driver.sleep(5000);
    console.log("✅ Logged in to Production!");
}

async function goToApprovedTab(driver, websiteName) {
    console.log(`📌 Navigating to All Items on ${websiteName}...`);
    let element = await driver.wait(until.elementLocated(By.css('[href="#/app/dashboard/items/3/"]')), 10000);
    await driver.wait(until.elementIsVisible(element), 5000);
    await driver.executeScript('arguments[0].scrollIntoView(true);', element);
    await driver.sleep(1000);
    await driver.executeScript('arguments[0].click();', element);
    console.log(`✅ Navigated to All Items on ${websiteName}`);
    
    try {
        let elementApproved = await driver.wait(until.elementLocated(By.xpath('//a/span[text()="Approved"]')), 15000);
        await driver.wait(until.elementIsVisible(elementApproved), 5000);  // Ensure visibility
        await driver.executeScript('arguments[0].click();', elementApproved);
        console.log(`✅ Approved tab clicked on ${websiteName}`);
    } catch (error) {
        console.warn(`⚠️ Approved tab not found on ${websiteName}.`);
    }
    await driver.sleep(3000);

    let applicationNumbers = ["0001", "0002"];  // You can modify the application numbers as needed
    let formData = [];

    // Process applications and download the data
    await processApplicationsAndDownloadFiles(driver, applicationNumbers);

    // Log the formData to verify data extraction
    console.log(`📊 Extracted Form Data for ${websiteName}:`, formData);

    return formData;
}

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

        // Re-locate the element if needed
        let firstResult = await driver.wait(
            until.elementLocated(By.css("table.table tbody tr:first-child td:nth-child(4) div div.d-flex.align-items-center")),
            10000
        );

        // Add a check to make sure the element is not stale before clicking
        await driver.wait(until.elementIsVisible(firstResult), 5000); // Wait until the element is visible

        await driver.actions().keyDown(Key.CONTROL).click(firstResult).keyUp(Key.CONTROL).perform();
        console.log(`✅ Clicked on the searched application: ${appNumber} (Opening in new tab)`);

        // Switch to new tab and process the application
        await driver.sleep(5000);
        let tabs = await driver.getAllWindowHandles();
        await driver.switchTo().window(tabs[tabs.length - 1]);
        console.log(`✅ Switched to new tab for application: ${appNumber}`);

        await driver.sleep(5000);

        // Wait for form to load and ensure the element is still in the DOM
        await driver.wait(until.elementLocated(By.id("requestform")), 5000);
        console.log("✅ Form loaded successfully");

        // Extract form data
        let formData = await extractFormData(driver);

        // Log the extracted data for debugging
        console.log(`📊 Extracted Form Data for application ${appNumber}:`, formData);

        // Close the current tab and return to the main tab
        await driver.close();
        await driver.switchTo().window(tabs[0]);
        console.log(`🔙 Switched back after processing ${appNumber}`);

        await driver.sleep(3000);
    }
}

// ✅ Extract form data with enhanced logging
async function extractFormData(driver) {
    let valuesAndLabels = await driver.executeScript(() => {
        let result = [];
        const seen = new Set(); // To track unique label-value pairs

        const inputElements = document.querySelectorAll('input.form-control, textarea.form-control, select.form-control');
        console.log("📊 Extracting form values...");

        inputElements.forEach(input => {
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

            const value = input.value.trim() || 'No value';
            if (label === 'No label' || value === 'No value') return;
            if (seen.has(label + value)) return;

            result.push({ label, value });
            seen.add(label + value);
        });

        return result;
    });

    console.log("📊 Extracted Data:", valuesAndLabels);
    return valuesAndLabels;
}

const path = require('path');
const { exec } = require('child_process');

function exportToExcel(mainStageData, productionData, appNumber) {
    // Create a workbook
    let wb = xlsx.utils.book_new();

    // Create a worksheet with the mainStageData
    let wsMainStage = xlsx.utils.json_to_sheet(mainStageData);
    xlsx.utils.book_append_sheet(wb, wsMainStage, `Main Stage Data`);

    // Create a worksheet with the productionData
    let wsProduction = xlsx.utils.json_to_sheet(productionData);
    xlsx.utils.book_append_sheet(wb, wsProduction, `Production Data`);

    // Define file path
    const fileName = `comparison_results_${appNumber}.xlsx`;
    const filePath = path.join(__dirname, fileName);

    // Write the Excel file to disk
    xlsx.writeFile(wb, filePath);

    console.log(`✅ Excel file saved: ${filePath}`);

    // Open the file (Platform dependent)
    if (process.platform === "win32") {
        exec(`start "" "${filePath}"`); // Windows
    } else if (process.platform === "darwin") {
        exec(`open "${filePath}"`); // macOS
    } else {
        exec(`xdg-open "${filePath}"`); // Linux
    }
}


