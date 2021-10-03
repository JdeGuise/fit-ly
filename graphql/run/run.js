const graphql = require("graphql");
const sqlite3 = require('sqlite3').verbose();

//create a database if no exists
const database = new sqlite3.Database("./fitly.db");

//create a table to insert Run
const createRunTable = () => {
    const query = `
      CREATE TABLE IF NOT EXISTS runs (
        id integer PRIMARY KEY,
        dateOfRun text,
        distance text,
        duration text,
        calories text 
    )`;
  
    return database.run(query);
}

//call function to init the Run table
createRunTable();

//creacte graphql Run object
const RunType = new graphql.GraphQLObjectType({
    name: "Run",
    fields: {
        id: { type: graphql.GraphQLID },
        dateOfRun: { type: graphql.GraphQLString },
        distance: { type: graphql.GraphQLString },
        duration: { type: graphql.GraphQLString },
        calories: { type: graphql.GraphQLString }        
    }
});
// create a graphql query to select all and by id
var queryType = new graphql.GraphQLObjectType({
    name: 'Query',
    fields: {
        //first query to select all
        Runs: {
            type: graphql.GraphQLList(RunType),
            resolve: (root, args, context, info) => {
                return new Promise((resolve, reject) => {
                    // raw SQLite query to select from table
                    database.all("SELECT * FROM Runs;", function(err, rows) {  
                        if(err){
                            reject([]);
                        }
                        resolve(rows);
                    });
                });
            }
        },
        //second query to select by id
        Run:{
            type: RunType,
            args:{
                id:{
                    type: new graphql.GraphQLNonNull(graphql.GraphQLID)
                }               
            },
            resolve: (root, {id}, context, info) => {
                return new Promise((resolve, reject) => {
                
                    database.all("SELECT * FROM Runs WHERE id = (?);",[id], function(err, rows) {                           
                        if(err){
                            reject(null);
                        }
                        resolve(rows[0]);
                    });
                });
            }
        }
    }
});
//mutation type is a type of object to modify data (INSERT,DELETE,UPDATE)
var mutationType = new graphql.GraphQLObjectType({
    name: 'Mutation',
    fields: {
      //mutation for creacte
      createRun: {
        //type of object to return after create in SQLite
        type: RunType,
        //argument of mutation creacteRun to get from request
        args: {
          dateOfRun: {
            type: new graphql.GraphQLNonNull(graphql.GraphQLString)
          },
          duration:{
              type: new graphql.GraphQLNonNull(graphql.GraphQLString)
          },
          distance:{
              type: new graphql.GraphQLNonNull(graphql.GraphQLString)
          },
          calories:{
              type: new graphql.GraphQLNonNull(graphql.GraphQLString)
          }
        },
        resolve: (root, {dateOfRun, distance, duration, calories}) => {
            return new Promise((resolve, reject) => {
                //raw SQLite to insert a new Run in Run table
                database.run('INSERT INTO Runs (dateOfRun, distance, duration, calories) VALUES (?,?,?,?);', [dateOfRun, distance, duration, calories], (err) => {
                    if(err) {
                        reject(null);
                    }
                    database.get("SELECT last_insert_rowid() as id", (err, row) => {
                        
                        resolve({
                            id: row["id"],
                            dateOfRun: dateOfRun,
                            distance: distance,
                            duration: duration,
                            calories: calories
                        });
                    });
                });
            })
        }
      },
      //mutation for update
      updateRun: {
        //type of object to return afater update in SQLite
        type: graphql.GraphQLString,
        //argument of mutation creacteRun to get from request
        args:{
            id:{
                type: new graphql.GraphQLNonNull(graphql.GraphQLID)
            },
            dateOfRun: {
                type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            },
            distance:{
                  type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            },
            duration:{
                  type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            },
            calories:{
                  type: new graphql.GraphQLNonNull(graphql.GraphQLString)
            }             
        },
        resolve: (root, {id, dateOfRun, distance, duration, calories}) => {
            return new Promise((resolve, reject) => {
                //raw SQLite to update a Run in Run table
                database.run('UPDATE Runs SET dateOfRun = (?), distance = (?), duration = (?), calories = (?) WHERE id = (?);', [dateOfRun, distance, duration, calories, id], (err) => {
                    if(err) {
                        reject(err);
                    }
                    resolve(`Run #${id} updated`);
                });
            })
        }
      },
      //mutation for update
      deleteRun: {
         //type of object resturn after delete in SQLite
        type: graphql.GraphQLString,
        args:{
            id:{
                type: new graphql.GraphQLNonNull(graphql.GraphQLID)
            }               
        },
        resolve: (root, {id}) => {
            return new Promise((resolve, reject) => {
                //raw query to delete from Run table by id
                database.run('DELETE from Runs WHERE id =(?);', [id], (err) => {
                    if(err) {
                        reject(err);
                    }
                    resolve(`Run #${id} deleted`);                    
                });
            })
        }
      }
    }
});

//define schema with Run object, queries, and mustation 
const schema = new graphql.GraphQLSchema({
    query: queryType,
    mutation: mutationType 
});

function createRun(dateOfRun, distance, duration, calories) {
    database.run('INSERT INTO Runs (dateOfRun, distance, duration, calories) VALUES (?,?,?,?);', [dateOfRun, distance, duration, calories]);
}

//export schema to use on index.js
module.exports = {
    schema,
    createRun
}