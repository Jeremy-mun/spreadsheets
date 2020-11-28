const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database( __dirname + '/users.db',
    function(err) {
        if ( !err ) {
            db.serialize( ()=> {
                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    pass TEXT NOT NULL,
                    admin BOOLEAN,
                    enabled BOOLEAN
                    );`
                );

                db.run(`
                    CREATE TABLE IF NOT EXISTS sheets (
                    sheet_id INTEGER PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    sheet TEXT,
                    shareable BOOLEAN,
                    user_id INTEGER NOT NULL,
                    FOREIGN KEY (user_id)
                        REFERENCES users (user_id)
                            ON DELETE CASCADE
                            ON UPDATE NO ACTION
                    );`
                );
            });
            console.log('opened users.db');
        }
    });

const express = require('express');
const hbs = require('express-hbs');
const bodyParser = require('body-parser');
const CSV = require('csv-string');
const jsonParser = bodyParser.json();
const textBody = bodyParser.text();
const cookieSession = require('cookie-session');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static( __dirname + '/public'));

app.engine('hbs', hbs.express4({
    partialsDir: __dirname + '/views/partials',
    defaultLayout: __dirname + '/views/layout/main.hbs'
  }));
  app.set('view engine', 'hbs');
  app.set('views', __dirname + '/views');

const port = process.env.PORT || 8000;

app.use(cookieSession({
    name: 'session',
    secret: 'foo'
  }));

function authorize(req, res, next) {
    if (req.session.signin === true) {
        next();
    }
    else {
        res.redirect('/');
    }
}

function isadmin(req, res, next) {
    if (req.session.admin === 'admin') {
        next();
    }
    else {
        res.redirect('/');
    }
}

function logout(req, res, next) {
    req.session.username = null;
    req.session.pass = null;
    req.session.signin = null;
    req.session.admin = null;
    next();
}

app.get('/', logout, function(req, res) {
    res.type('html');
    res.render('login', {
        title : 'login'
    });
});

app.get('/register', logout, function(req, res) {
    res.type('html');
    res.render('register', {
        title : 'register'
    });
});

app.get('/account', authorize, function(req, res) {
    res.type('html');
    res.render('account', {
        sess : req.session,
        title : 'account'
    });
});

app.get('/change', authorize, function(req, res) {
    res.type('html');
    res.render('change', {
        sess : req.session,
        title : 'changepassword'
    });
});

app.get('/admin', authorize, isadmin, function(req, res) {
    res.type('html');
    res.render('admin', {
        title : 'admin page'
    })
});

app.get('/modify', authorize, isadmin, function(req, res) {
    db.all(`SELECT * FROM users`,[], function(err, rows) {
        if ( !err ) {
            res.type('.html');
            res.render('modify', {
                users : rows,
                title : 'modify accounts'
            });
        }
    });
});

app.get('/delete', authorize, isadmin, function(req, res) {
    db.all(`SELECT * FROM users`,[], function(err, rows) {
        if ( !err ) {
            res.type('.html');
            res.render('delete', {
                users : rows,
                title : 'delete accounts'
            });
        }
    });
});

app.get('/available_sheets', authorize, function(req, res) {
    res.type('html');
    res.render('available_sheets', {
        sess : req.session,
        title : req.session.username + ' Available Sheets'
    });
});

app.get('/user_sheets', authorize, function(req, res) {
    res.type('html');
    res.render('user_sheets', {
        sess : req.session,
        title : req.session.username + '\'s Sheets'
    });
});

app.get('/edit_sheets', authorize, function(req, res) {
    res.type('html');
    res.render('edit_sheets', {
        sess : req.session,
        title : 'edit' + req.session.username + '\'s Sheets'
    });
});

app.get('/reports', authorize, function(req, res) {
    res.type('html');
    res.render('reports', {
        sess : req.session,
        title : 'Graphical Reports'
    });
});

app.get('/shared-sheets', function(req, res) {
    if( req.session.admin === 'admin') {
        db.all('SELECT name FROM sheets', [],
        function( err, rows ) {
            if ( !err ) {
                const names = rows.map( (x) => x.name );
                res.send( names );
                console.log( 'sending',  names );
            }
            else {
                res.send( {err:err} );
            }
        });
    }
    else {
        db.all('SELECT name FROM sheets WHERE shareable = ?', [true],
        function( err, rows ) {
            if ( !err ) {
                const names = rows.map( (x) => x.name );
                res.send( names );
                console.log( 'sending',  names );
            }
            else {
                res.send( {err:err} );
            }
        });
    }
});

app.get('/user-sheets', function(req, res) {
    const user = req.session.user_id;
    db.all('SELECT name FROM sheets WHERE user_id = ?', [user],
    function( err, rows ) {
        if ( !err ) {
            const names = rows.map( (x) => x.name );
            res.send( names );
            console.log( 'sending',  names );
        }
        else {
            res.send( {err:err} );
        }
    });
});

app.get('/edit-sheets', function(req, res) {
    const user = req.session.user_id;
    db.all('SELECT name FROM sheets WHERE user_id = ?', [user],
    function( err, rows ) {
        if ( !err ) {
            const names = rows.map( (x) => x.name );
            res.send( names );
            console.log( 'sending',  names );
        }
        else {
            res.send( {err:err} );
        }
    });
});

app.get('/sheet/:name', function(req, res) {
    const name = req.params.name;
    db.get('SELECT sheet, shareable FROM sheets where name = ?', [name],
        function( err, row ) {
            if ( !err ) {
                res.send( row );
                console.log( 'sending', row );
            }
            else {
                res.send( {err:err} );
            }
        }
    );
});

app.get('/available-sheet/:name', function(req, res) {
    const name = req.params.name;
    db.get('SELECT sheet FROM sheets where name = ?', [name],
        function( err, row ) {
            if ( !err ) {
                res.send( row.sheet );
                console.log( 'sending', row.sheet );
            }
            else {
                res.send( {err:err} );
            }
        }
    );
});

app.get('/csv-export/:name', (req,res) => {
    const name = req.params.name;
    db.get('SELECT sheet FROM sheets where name = ?', [name],
        function( err, row ) {
            if ( !err ) {
                let values = JSON.parse( row.sheet );
                let csv = ''
                for( let row of values ) {
                    csv += CSV.stringify( row ); 
                }
                res.set('Content-Type', 'text/plain')
                res.set('Content-Disposition',
                    `attachment; filename="${name}.csv"`);
                res.send( csv );
            }
            else {
                res.status(404).send("not found");
            }
        }
    );
});

app.post('/', function(req, res){
    const form = req.body;
    db.get('SELECT * FROM users WHERE username = ?',
            [form.user],
            function(err, row) {
                if(err) {
                    console.log(err);
                }
                else {
                    console.log(row);
                    if(row) {
                        if( row.pass === form.pass && row.enabled) {
                            req.session.username = row.username;
                            req.session.signin = true;
                            req.session.admin = row.admin;
                            req.session.user_id = row.user_id;
                            res.redirect('/account');
                        }
                        else {
                            res.redirect('/not_registered.html')
                        }
                    }
                    else {
                        res.redirect('/not_registered.html')
                    }
                }
            }
        );
    res.type('.html');
});

app.post('/register', function(req, res) {
    const form = req.body;

    db.run(`INSERT INTO users(username,pass,admin,enabled) VALUES(?,?,?,?)`,
            [form.user, form.pass, form.admin, true],
            function( err) { if (!err) { res.redirect('/registered.html'); }
                else {
                    res.redirect('/failedregister.html');
                }
            }
        );
});

app.post('/change', function(req, res) {
    const form = req.body
    db.run(`UPDATE users SET pass=? WHERE username=?`,
            [form.pass, req.session.username],
            function( err) { if (!err) { res.redirect('/change'); } }
        );
});

app.post('/modify', function(req, res) {
    const form = req.body;
    console.log('modify', form );
    let id = parseInt( form.user );
    let enabled = form.hasOwnProperty('enabled');
    db.run(`UPDATE users SET username=?, pass=?, admin =?, enabled=? WHERE id=?`,
        [form.username, form.pass, form.admin, enabled, id],
        function( err) { if (!err) { res.redirect('/modify'); } }
    );
});

app.post('/delete', function(req, res) {
    const form = req.body;
    console.log('delete', form );
    let id = parseInt( form.user );
    db.run(`DELETE FROM users WHERE id = ?`, [id],
            function( err) { if (!err) { res.redirect('/delete'); } }
        );
});

app.put( '/create-sheet/:name', jsonParser, (req,res) => {
    const name = req.params.name;
    const uid = req.session.user_id;
    const values = req.body.values;
    const shareable = req.body.share;
    console.log( 'create sheet', values );
    console.log('shareable', shareable);
    const strValues = JSON.stringify( values );

    db.run(`INSERT INTO sheets (name,sheet,shareable,user_id) VALUES(?,?,?,?)`,
        [name,strValues,shareable,uid],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} );
            }
        }
    );
});

app.put( '/copy-sheet/:name', jsonParser, (req,res) => {
    const name = req.params.name;
    const uid = req.session.user_id;
    const values = req.body;
    console.log( 'copy sheet', values );
    const strValues = JSON.stringify( values );
    db.run(`INSERT INTO sheets (name,sheet,shareable,user_id) VALUES(?,?,?,?)`,
        [name,strValues,false,uid],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} );
            }
        }
    );
});

app.put( '/save-sheet/:name', jsonParser, (req,res) => {
    const name = req.params.name;
    const values = req.body;
    console.log( 'save sheet', values );
    const strValues = JSON.stringify( values );

    db.run(`UPDATE sheets SET sheet = ? WHERE name = ?`,
        [strValues,name],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} );
            }
        }
    );
});

app.put( '/shareable-sheet/:name', jsonParser, (req,res) => {
    const name = req.params.name;
    const share = req.body.shareable;
    console.log(req.body);
    console.log( 'shareable: ', share );

    db.run(`UPDATE sheets SET shareable = ? WHERE name = ?`,
        [share,name],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} );
            }
        }
    );
});

app.put( '/change/:oldname/:newname', jsonParser, (req,res) => {
    const oldname = req.params.oldname;
    const newname = req.params.newname;
    console.log( 'oldname', oldname );
    console.log('newname', newname);
    db.run(`UPDATE sheets SET name = ? WHERE name = ?`,
        [newname,oldname],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} );
            }
        }
    );
});

app.put( '/csv-import/:name', textBody, (req,res) => {
    const name = req.params.name;
    const uid = req.session.user_id;
    const sheet = [];
    console.log('importing', req.body);
    CSV.forEach(req.body, ',', function(row, index) {
        sheet.push( row );
    });
    let strValues = JSON.stringify( sheet );
   strValues = strValues.substring(0,strValues.length - 6);
   strValues += ']'; 
    db.run(`INSERT INTO sheets (name,sheet,shareable,user_id) VALUES(?,?,?,?)`,
        [name,strValues,false,uid],
        function(err) {
            if (!err) {
                res.send( {ok:true} );
            }
            else {
                res.send( {ok:false} );
            }
        }
    );
});

app.delete('/sheet/:name', function(req, res) {
    const name = req.params.name;
    db.run('DELETE FROM sheets WHERE name = ?', [name],
        function( err, row ) {
            if ( !err ) {
                res.send( { ok: true} ); 
            }
            else {
                res.send( {err:err} );
            }
        }
    );
});

app.listen(port, function() {
    console.log(`Listening on port ${port}!`);
});