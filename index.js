/** 23/02/2025
 *  Chico Demmenie
 *  LSU/index.js
 */

const version = require('./package').version;
const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
require('dotenv').config({path: './config.env'});

const year = new Date().getFullYear()


//------------------------------------------------------------------------------
// Initialise server variables
const init = () => {

    // initialise express app
    this.app = express();
    this.app.set('view engine', 'ejs');
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('combined'));
    server.bind(this)();
    console.log('User connected.');
}


//------------------------------------------------------------------------------
// Server runtime function
const server = () => {

    
    // =================================
    // listens for activity on root page
    // takes request, response
    this.app.get('/', (req, res) => {
        // Render page
        res.render('index', {year: year});
    });

    //Listens listens for the search form to be returned.
    this.app.post('/q', (req, res) => {
        const query = req.body.search;

        res.redirect(`/search?q=${query}`);
    });

    // =================================
    //This calls the python search function and returns the completed view.
    this.app.get('/search', async (req, res) => {
        /*Calling the cleaning function to make sure that the input is a
        link and not something else.*/
        const cleaning = new Promise(async (resolve) => {
            resolve(await python`search.DBSearch().cleaning(
                ${req.query.q}
            )`);
        });

        this.clean = await cleaning;
        cleaning.then(function(){
            //If the input is clean then we'll go look for it.
            
            if (this.clean == true) {
                async function sSearch() {
                    return await python`search.DBSearch().standard(
                        ${req.query.q}
                    )`;
                }
                sSearch.bind(this)().then(function(sResponse) {
                    console.log(sResponse)

                    /*If the search returns 'null' then there's nothing to
                    show the user*/
                    if (sResponse == null) {
                        res.render('notFound', {searchTerm: req.query.q,
                            year: year, version: version});
                    } else if (sResponse == "download_failed"){
                        sendErr(req, res, 500);
                    } else {
                        let page = pageRender(sResponse).toString();
                        page = page.replaceAll(",", "");
                        page = page.replaceAll("**", ",");
                        
                        res.render('search',
                        {page: page, searchTerm: req.query.q, year: year,
                            version: version});
                    }
                }.bind(pageRender));

            } else {
                res.redirect(`/url_deny?q=${req.query.q}`);
            }
        }.bind(this, pageRender));
    });

    // =================================
    // Returns the about page.
    this.app.get('/about', (req, res) => {
        const counts = new Promise(async (resolve) => {
            resolve(await python`search.DBSearch().entryCount()`);
        });

        counts.then(function(counts){
            res.render('about', {vidCount: counts[0], postCount: counts[1],
                year: year, version: version});
            });
    });

    // =================================
    // Sends a specific page when the search term isn't clean.
    this.app.get('/url_deny', (req, res) => {
        res.render('url_deny', {searchTerm: req.query.q, year: year, 
            version: version});
    });

    // =================================
    // Returns any document within the 'assets' directory.
    this.app.get(`/assets/*`, (req, res) => {
        const assetPath = path.join(__dirname, req.path);

        // If the file doesn't exist return 404
        try {
            if (fs.existsSync(assetPath)) {
                res.sendFile(assetPath);
            } else {
                sendErr(req, res, 404);
            }
          } catch(err) {
            sendErr(req, res, 404);
          }
    });

    // =================================
    // Returns any document within the 'static' directory
    this.app.get(`/static/*`, (req, res) => {
        const assetPath = path.join(__dirname, req.path);

        try {
            if (fs.existsSync(assetPath)) {
                res.sendFile(assetPath);
            } else {
                sendErr(req, res, 404);
            }
          } catch(err) {
            sendErr(req, res, 404);
          }
    });

    // =================================
    // These are some extra routes for specific assets.
    this.app.get(`/aethra.webmanifest`, (req, res) => {
        const assetPath = path.join(__dirname, "/aethra.webmanifest");
        res.sendFile(assetPath);
    });

    this.app.get(`/serviceWorker.js`, (req, res) => {
        const assetPath = path.join(__dirname, "serviceWorker.js");
        res.sendFile(assetPath);
    });

    this.app.get(`/offline`, (req, res) => {
        res.render('offline', {url: req.url, year: year, version: version});
    });

    this.app.get(`/favicon.ico`, (req, res) => {
        const assetPath = path.join(__dirname, "assets/favicon.ico");
        res.sendFile(assetPath);
    });

    // =================================
    // Sends any request that isn't recognised before this to the 404 function.
    this.app.get('*', (req, res, next) => {
        const err = 404
        sendErr(req, res, err);
    });

    // =================================
    // A function that will respond with a 404 error.
    function sendErr(req, res, err) {
        // Setting the response code to 404
        res.status(err);

        if (err == 404){
            title = "404: Page doesn't exist";
            text = "Whoops, Wrong page...maybe try a different one?";
        } else if (err == 500){
            title = "500: Server error";
            text = "Oops, something went wrong (It's us not you)..."+
                "maybe try again? 🤷";
        }
      
        // respond with html page rendered with the correct message
        if (req.accepts('html')) {
            res.render('error', {url: req.url, error: title,
            text: text, year: year, version: version});
            return;
        }
      
        // respond with json
        if (req.accepts('json')) {
          res.json({ error: err });
          return;
        }
      
        // default to plain-text
        res.type('txt').send(err);
    }
    
    // Start listening on the standard port
    this.app.listen(process.env.PORT, () => {
        console.log(`Server Listening on port ${process.env.PORT}`);
    });
}

init();