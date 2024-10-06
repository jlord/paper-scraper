const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

// Missing Family members died between two census years
const years = ["1900", "1901", "1902", "1903", "1904", "1905", "1906", "1907", "1908", "1909", "1910"]

// Title IDs for local papers
const madisonDanielsville = "sn89053317" // Danielsville Monitor
const banksCounty = "sn88054073" // Banks County Journal

// The title ID of the publication we're currently interested in
const titleID = madisonDanielsville

const outputDir = path.join(__dirname, "output", titleID)

async function getIssueDatesForYear (year) {
  // Find all of the available issues, as links, within a calendar year
  const url = `https://gahistoricnewspapers.galileo.usg.edu/lccn/${titleID}/issues/${year}/`
  const response = await fetch(url)
  const htmlText = await response.text()
  const htmlDom = cheerio.load(htmlText)
  const anchors = htmlDom("a").toArray()

  return anchors
    .map((e) => e.attribs.href)
    .filter((h) => h.startsWith(`/issues/${titleID}`))
    // sn88054073 is the ID for this specific paper (maybe) Banks Count Journal (Homer, Ga)
    // Example: https://gahistoricnewspapers.galileo.usg.edu/lccn/sn88054073/1900-01-04/ed-1/
    // isolate just the full issue date: 1900-01-04
    .map((f) => f.substring(19, 29))
}

async function getTextPageURLFromIssueDate (issueDate) {
  const url = `https://gahistoricnewspapers.galileo.usg.edu/issues/${titleID}/${issueDate}/`

  const response = await fetch(url)
  const htmlText = await response.text()
  const htmlDom = cheerio.load(htmlText)

  const anchors = htmlDom("a").toArray()

  const regex = new RegExp(`/lccn/${titleID}/${issueDate}/ed-\\d/seq-`)

  return anchors
    .map((e) => e.attribs.href)
    .filter((h) => regex.test(h))
    .map((f) => `https://gahistoricnewspapers.galileo.usg.edu${f}ocr.txt`)
}

async function saveTextToFile (textURL) {
  const response = await fetch(textURL)
  const text = await response.text()

  const filename = textURL.substring(61).replaceAll("/", "_")

  fs.writeFileSync(`${outputDir}/${filename}`, text)
}

// LET'S GO!!! LOOP THROUGH THE YEARS AND SO FORTH
async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  for (let year of years) {
    // Get all the issue dates in a given year
    const issueList = await getIssueDatesForYear(year)
    for (let issueDate of issueList) {
      // Get the urls of each issue's pages
      const pageURLs = await getTextPageURLFromIssueDate(issueDate)
      for (let pageURL of pageURLs) {
        await saveTextToFile(pageURL)
      }
    }
  }
}

main()



// Year Page https://gahistoricnewspapers.galileo.usg.edu/lccn/sn88054073/issues/1900/
// -- Contains multiple Issues
// Issue Page https://gahistoricnewspapers.galileo.usg.edu/lccn/sn88054073/1900-01-04/ed-1/
// -- Contains multiple pages
// Page Page https://gahistoricnewspapers.galileo.usg.edu/lccn/sn88054073/1900-01-04/ed-1/seq-1/
// -- Contains Scan, PDF, Text, etc
// Text Page https://gahistoricnewspapers.galileo.usg.edu/lccn/sn88054073/1900-01-04/ed-1/seq-1/ocr.txt
