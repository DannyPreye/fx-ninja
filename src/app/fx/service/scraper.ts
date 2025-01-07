import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { basicConfig } from "../../../config/configs";
import { countryCurrencyMap, countryMap } from "../../../utils/countryMap";


puppeteer.use(StealthPlugin());


export class ForexNews
{
    private llm;
    private dataSources = {
        economicCalendar: "https://tradingeconomics.com/calendar",
        interestRates: "https://tradingeconomics.com/country-list/interest-rate?continent=world",
        countryInformation: (formattedCountry: string) => `https://tradingeconomics.com/${formattedCountry}/indicators`
    };
    constructor ()
    {
        this.llm = new ChatGoogleGenerativeAI({
            apiKey: basicConfig.generativeIA.apiKey,
            model: "gemini-2.0-flash-exp",
            temperature: 1
        });

    }
    private async createBrowser()
    {
        try {
            // Try launching with default configuration first
            return await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-gpu'
                ]
            });
        } catch (error) {
            console.log("Failed to launch with default configuration, trying alternative approaches...");

            try {
                // Try launching with system Chrome installation
                return await puppeteer.launch({
                    headless: true,
                    channel: 'chrome',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-web-security',
                        '--disable-gpu'
                    ]
                });
            } catch (secondError) {
                console.error("Failed to launch browser:", secondError);
                throw new Error("Unable to launch Chrome browser. Please ensure Chrome is installed on your system.");
            }
        }
    }

    private async setupPage(browser: any)
    {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(90000);
        await page.setRequestInterception(true);

        page.on('request', (request: any) =>
        {
            if ([ 'image', 'stylesheet', 'font' ].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        return page;
    }

    private async getInterestRate(currencyPair: string)
    {
        const [ baseCurrency, quoteCurrency ] = currencyPair.match(/.{1,3}/g) || [];
        // @ts-ignore
        const base = countryMap[ baseCurrency ];
        // @ts-ignore
        const quote = countryMap[ quoteCurrency ];

        let browser;
        try {
            browser = await this.createBrowser();
            const page = await this.setupPage(browser);

            await page.goto(this.dataSources.interestRates, { waitUntil: "networkidle2" });

            // @ts-ignore
            const rates = await page.evaluate((base, quote) =>
            {
                // @ts-ignore
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                const getData = (country: string) =>
                {
                    // @ts-ignore
                    const row = rows.find(r => r.querySelector('td:first-child')?.textContent?.trim() === country);
                    // @ts-ignore
                    return row ? parseFloat(row.querySelector('td:nth-child(2)')?.textContent?.trim() || '0') : null;
                };
                return {
                    baseRate: getData(base),
                    quoteRate: getData(quote)
                };
            }, base, quote);

            return {
                baseCurrency,
                quoteCurrency,
                baseRate: rates.baseRate,
                quoteRate: rates.quoteRate,
                interestRateDifferential: rates.baseRate !== null && rates.quoteRate !== null ? rates.baseRate - rates.quoteRate : null
            };
        } catch (error) {
            console.error('Error in getInterestRate:', error);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }

    private async getCountryInformation(currencyPair: string)
    {
        const [ baseCurrency, quoteCurrency ] = currencyPair.match(/.{1,3}/g) || [];
        const base = countryMap[ baseCurrency ];
        const quote = countryMap[ quoteCurrency ];
        let browser;

        try {
            browser = await this.createBrowser();

            async function scrapeCountryData(country: string, browser: any)
            {
                const page = await browser.newPage();
                await page.setDefaultNavigationTimeout(90000);
                await page.setRequestInterception(true);

                page.on('request', (request: any) =>
                {
                    if ([ 'image', 'stylesheet', 'font' ].includes(request.resourceType())) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });

                try {
                    const formattedCountry = country.toLowerCase()
                        // .replace(/\s+area$/, '')
                        .replace(/\s+/g, '-')
                        .replace(/[()]/g, '');

                    const url = `https://tradingeconomics.com/${formattedCountry}/indicators`;
                    console.log(`Scraping data for ${country} from URL: ${url}`);

                    await page.goto(url, { waitUntil: 'networkidle2' });
                    await page.waitForSelector('tbody tr', { timeout: 30000 });

                    const data = await page.evaluate(() =>
                    {
                        const rows = Array.from(document.querySelectorAll('tbody tr'));

                        return rows.map(row =>
                        {
                            const cells = row.querySelectorAll('td');
                            const indicator = cells[ 0 ]?.querySelector('a')?.textContent?.trim() || '';
                            const lastValue = cells[ 1 ]?.textContent?.trim() || '';
                            const previousValue = cells[ 2 ]?.textContent?.trim() || '';
                            const unit = cells[ 5 ]?.textContent?.trim() || '';
                            const date = cells[ 6 ]?.textContent?.trim() || '';

                            // Clean up the values
                            const cleanValue = (value: string) =>
                            {
                                if (value.includes('te-value-negative')) {
                                    return `-${value.replace(/[^\d.]/g, '')}`;
                                }
                                return value.replace(/[^\d.-]/g, '');
                            };

                            return {
                                indicator: indicator,
                                last: cleanValue(lastValue),
                                previous: cleanValue(previousValue),
                                unit: unit,
                                date: date
                            };
                        }).filter(item =>
                        {
                            // Filter for important economic indicators
                            const keyIndicators = [
                                'GDP Growth Rate',
                                'Inflation Rate',
                                'Interest Rate',
                                'Unemployment Rate',
                                'Balance of Trade',
                                'Government Debt to GDP',
                                'Business Confidence',
                                'Manufacturing PMI',
                                'Consumer Confidence'
                            ];
                            return keyIndicators.some(indicator =>
                                item.indicator.toLowerCase().includes(indicator.toLowerCase())
                            );
                        });
                    });

                    if (!data || data.length === 0) {
                        console.log(`No data found for ${country}`);
                        return null;
                    }

                    return data;

                } catch (error) {
                    console.error(`Error scraping data for ${country}:`, error);
                    return null;
                } finally {
                    await page.close();
                }
            }

            const [ baseCountryData, quoteCountryData ] = await Promise.all([
                scrapeCountryData(base, browser),
                scrapeCountryData(quote, browser)
            ]);

            return {
                baseCountry: {
                    name: base,
                    data: baseCountryData || 'Data unavailable'
                },
                quoteCountry: {
                    name: quote,
                    data: quoteCountryData || 'Data unavailable'
                }
            };

        } catch (error) {
            console.error('Error in getCountryInformation:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    private async getEconomicCalendar(currencyPair: string)
    {
        let browser;
        try {
            browser = await this.createBrowser();
            const page = await this.setupPage(browser);

            // Navigate to the calendar page
            await page.goto(this.dataSources.economicCalendar, {
                waitUntil: 'networkidle2',
                timeout: 90000
            });

            // Wait for the calendar to load
            await page.waitForSelector("#calendar", { timeout: 30000 });

            // Scroll to load more data
            await page.evaluate(() =>
            {
                // @ts-ignore
                window.scrollBy(0, window.innerHeight);
            });

            // Give some time for dynamic content to load
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Take screenshot for debugging if needed
            // await page.screenshot({ path: 'debug_calendar.png' });

            // Extract the base and quote currencies before passing to evaluate
            const [ baseCurrency, quoteCurrency ] = currencyPair.match(/.{1,3}/g) || [];
            // @ts-ignore
            const baseCountry = countryCurrencyMap[ baseCurrency ] || '';
            // @ts-ignore
            const quoteCountry = countryCurrencyMap[ quoteCurrency ] || '';

            // Get the calendar data
            // @ts-ignore
            const data = await page.evaluate((baseCountry, quoteCountry) =>
            {
                // @ts-ignore
                const rows = Array.from(document.querySelectorAll('#calendar tbody tr'));

                return rows.map(row =>
                {

                    // @ts-ignore
                    const columns = row.querySelectorAll('td');
                    const country = columns[ 1 ]?.textContent?.trim() || '';

                    // Check if the event is relevant for our currency pair
                    if (country === baseCountry || country === quoteCountry) {
                        return {
                            time: columns[ 0 ]?.textContent?.trim() || '',
                            country: country,
                            event: columns[ 4 ]?.textContent?.trim() || '',
                            actual: columns[ 5 ]?.textContent?.trim() || '',
                            previous: columns[ 6 ]?.textContent?.trim() || '',
                            consensus: columns[ 7 ]?.textContent?.trim() || '',
                            forecast: columns[ 8 ]?.textContent?.trim() || ''
                        };
                    }
                    return null;
                }).filter(event => event !== null);
            }, baseCountry, quoteCountry);

            if (!data || data.length === 0) {
                console.log(`No economic calendar events found for ${currencyPair}`);
                return [];
            }

            return data;

        } catch (error) {
            console.error('Error loading economic calendar:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }


    async getFundamentals(currencyPair: string)
    {
        return {
            economicCalendar: await this.getEconomicCalendar(currencyPair),
            interestRates: await this.getInterestRate(currencyPair),
            countryInformation: await this.getCountryInformation(currencyPair)
        };
    }

}
