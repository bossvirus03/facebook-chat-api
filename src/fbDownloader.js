// const axios = require("axios")
// const cheerio = require("cheerio")
// const util = require("./util")

// module.exports = fbDownloader = async (url)=>{
//     return new Promise((resolve, reject)=>{
//         const BASE_URL = "https://fdownloader.net"
//         //GET TOKEN
//         axios({
//             url : BASE_URL
//         }).then((page)=>{
//             let $ = cheerio.load(page.data), code = $("body > div.container-app > script").text()
//             let token = new Function(`${code}; return {k_token, k_exp};`)()
//             //GET SCRAPPER DATA
//             axios({
//                 method: 'post',
//                 url : `${BASE_URL}/api/ajaxSearch`,
//                 data : `k_exp=${token.k_exp}&k_token=${token.k_token}&q=${url}`
//             }).then((response)=>{
//                 let $ = cheerio.load(response.data.data), download = []
//                 $("#fbdownloader > div.tab-wrap > div:nth-child(5) > table > tbody > tr").each(function (i, elem){
//                     let trElement = $(elem)
//                     let tds = trElement.children()
//                     let quality = $(tds[0]).text().trim(), url = $(tds[2]).children("a").attr("href")
//                     if(url != undefined){
//                         download.push({
//                             quality,
//                             url
//                         })
//                     }
//                 })
//                 resolve({
//                     success:true,
//                     video_length: util.convertTime($("div.clearfix > p").text().trim()),
//                     download
//                 })
//             }).catch((e)=>{
//                 reject({
//                     success:false,
//                     error: "scrapping page error"
//                 })
//             })
//         }).catch((e)=>{
//             reject({
//                 success:false,
//                 error : "get token error"
//             })
//         })
//     })
    
// }
