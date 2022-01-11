const { argv } = require('process');
const md5 = require('md5');
const salt = 'denis';
const fs = require('fs');

let command = argv[2];
let login = argv[3];
let password = argv[4];
let perms = Number(argv[5]);
let clientId = Number(argv[6]);

if (command == '--help') {
  console.log('For add new user: node usercontrol add <login> <password> <permissions 0 - admin, 1 - user> <client id any number>');
  console.log('For remove user: node usercontrol remove <login> (main admin cant delete)');
  console.log('For change password: node usercontrol newpas <login> <newpassword>');

  return false;
}

if (command == undefined) {
  console.log("Need command. For help use: node usercontrol --help");
  return false;
}

if (command == 'add') {

  if (login == undefined || password == undefined || perms == undefined || clientId == undefined) {
    console.log("Incorrect format");
    return false;
  }

  if (login.length < 4) {
    console.log("Login must be more than 3 characters");
    return false;
  }

  if (login.length < 4) {
    console.log("Password must be more than 3 characters");
    return false;
  }

  if (isNaN(clientId)) {
    console.log('Incorrect client id');
    return false;
  }

  let usersFile = JSON.parse(fs.readFileSync('users.json'));  

  for (let userLogin in usersFile) {
    if (userLogin === login) {
      console.log(`User ${login} exists.`);
      return false;
    }
  }

  if (perms < 0 || perms > 1 || isNaN(perms)) {
    console.log("Incorrect permissions code. 0 - admin, 1 - user");
    return false;
  }

  usersFile[login] = {login: login, hash: md5(password + salt), perms: perms, user_id: clientId};

  fs.writeFileSync('users.json', JSON.stringify(usersFile));

  console.log(`USER ${login} ${password} added, client_id = ${clientId}`);
}

if (command == 'remove') {

  if (login == undefined) {
    console.log("Incorrect format");
    return false;
  }

  let usersFile = JSON.parse(fs.readFileSync('users.json'));
  if (login == 'admin') {
    console.log('You cant delete the main admin');
    return false;
  }

  delete(usersFile[login]);

  fs.writeFileSync('users.json', JSON.stringify(usersFile));

  console.log(`USER ${login} REMOVED`);
}


if (command == 'newpas') {

  if (login == undefined || password == undefined) {
    console.log("Incorrect format");
    return false;
  }

  let usersFile = JSON.parse(fs.readFileSync('users.json'));
  
  usersFile[login].hash = md5(password + salt);

  fs.writeFileSync('users.json', JSON.stringify(usersFile));

  console.log(`USER ${login} PASSWORD CHANGED TO ${password}`);
}