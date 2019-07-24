var util = require('./util');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;  
const csvWriter = createCsvWriter({  
  path: 'regions_appnexus_id.csv',
  header: [
    {id: 'id', title: 'id'},
    {id: 'region_code', title: 'region_code'},
    {id: 'region_name', title: 'region_name'},
    {id: 'country_code', title: 'country_code'},
    {id: 'country_name', title: 'country_name'},
    {id: 'appnexus_region_id', title: 'appnexus_region_id'}
  ]
});

module.exports = {
    main: async function main(authorizationToken) {
        try {
            let countries = await getCountries(authorizationToken)
            let csvData = new Array
            let rowId = 1
            for (let i = 0; i < countries.length; i++) {
                const country = countries[i]
                console.log(`-------Processing ${country.code} - ${country.name}`)
                try {
                    let regions = await getRegions(country.id, authorizationToken)
                    let currentRecordCount = csvData.length
                    regions.forEach(region => {
                        if(addDataRecord(csvData, region, rowId)) rowId++
                    });
                    console.log(`Regions processed: ${csvData.length - currentRecordCount}`)
                } catch (error) {
                    console.log(`There was an error calling getRegions: ${error}`)
                }
            }
            saveDataToCSV(csvData)
        } catch (error) {
            console.log(`There was an error calling getCountries: ${error}`)
        }
    }
}

function saveDataToCSV(data){
    csvWriter
        .writeRecords(data)
        .then(()=> console.log('***********************************The CSV file was written successfully'));
}

function addDataRecord(csvData, region, rowId){
    let hasIsoCode = false
    if(region.iso_3166_2) { hasIsoCode = true }

    csvData.push({
       id: hasIsoCode ? rowId: '',
       region_code: region.iso_3166_2,
       region_name: region.name,
       country_code: region.country_code,
       country_name: region.country_name,
       appnexus_region_id: region.id
    });
    return hasIsoCode
}

async function getCountries(authorizationToken){
    return new Promise((async (resolve, reject) => {
        let requestOptions = getRequestOptions('/country', authorizationToken)
        try{
            let response = await util.sendHttpRequestMessage(requestOptions)
            let jsonResponse = JSON.parse(response)
            let totalElements = jsonResponse.response.count
            let countries = jsonResponse.response.countries
            if(totalElements > 100){
                let numberOfRequests = Math.floor(totalElements/100)
                let startElement = 100
                for (let i = 0; i < numberOfRequests; i++) {
                    requestOptions = getRequestOptions(`/country?start_element=${startElement}`, authorizationToken)
                    response = await util.sendHttpRequestMessage(requestOptions)
                    jsonResponse = JSON.parse(response)  
                    countries = countries.concat(jsonResponse.response.countries) 
                    startElement = startElement + 100              
                }
            }
            resolve (countries)
        }catch(err){
            return reject(new Error(err))
        }
    }));
}

async function getRegions(countryId, authorizationToken){
    return new Promise((async (resolve, reject) => {
        let requestOptions = getRequestOptions(`/region?country_id=${countryId}`, authorizationToken)
        try{
            let response = await util.sendHttpRequestMessage(requestOptions)
            let jsonResponse = JSON.parse(response)
            let totalElements = jsonResponse.response.count
            let regions = jsonResponse.response.regions
            if(totalElements > 100){
                let numberOfRequests = Math.floor(totalElements/100)
                let startElement = 100
                for (let i = 0; i < numberOfRequests; i++) {
                    requestOptions = getRequestOptions(`/region?country_id=${countryId}&start_element=${startElement}`, authorizationToken)
                    response = await util.sendHttpRequestMessage(requestOptions)
                    jsonResponse = JSON.parse(response)  
                    regions = regions.concat(jsonResponse.response.regions) 
                    startElement = startElement + 100              
                }
            }
            resolve (regions)
        }catch(err){
            return reject(new Error(err))
        }
    }));
}

function getRequestOptions(path, authorizationToken){
    return {
        method: 'GET',
        hostname: 'api.appnexus.com',
        path: path,
        headers: {
            Authorization: authorizationToken
        }
    };
}