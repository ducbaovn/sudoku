var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Q = require('q');
var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    // password: '',
    // database: ''
});
var query = Q.nbind(pool.query, pool);

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser());
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
	query('SELECT DISTINCT number, title FROM kenglish')
	.then(function(data){
		response.render('index.ejs', {lesson: data[0]});	
  })
});

app.post('/lesson', function(request, response) {
	query('SELECT number, title, vocabulary, mean FROM kenglish WHERE number = '+request.body.lesson)
	.then(function(data){
		response.render('lesson.ejs', {lesson: data[0]});	
	})
});

app.post('/excercise', function(request, response) {
  query('SELECT number, title, vocabulary, mean FROM kenglish WHERE number = '+request.body.excercise)
	.then(function(data){
		response.render('excercise.ejs', {lesson: shuffle(data[0])});	
	})
});

app.get('/insert', function(request, response) {
  response.render('insert.ejs');
});

app.get('/sudoku/play', function(request, response) {
  var sudoku = [
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""]  
  ];
  var solution = [];

  function checkRow(i, j, k){
    for (var x = 0; x < 9; x++){
      if (sudoku[i][x] == k && x!=j) {
        return false;
      }
    }
    return true;
  }

  function checkCol(i, j, k){
    for (var x = 0; x < 9; x++){
      if (sudoku[x][j] == k && x!=i) {
        return false;
      }
    }
    return true;
  }

  function check3x3(i, j, k){
    for (var m = Math.floor(i/3)*3; m < Math.floor(i/3)*3 + 3; m++){
      for (var n = Math.floor(j/3)*3; n < Math.floor(j/3)*3 + 3; n++){
        if (sudoku[m][n] == k && (m!=i || n!=j)) {
          return false;
        }
      }
    }
    return true;
  }

  function check(i, j, k) {
    if (!checkRow(i,j,k) || !checkCol(i,j,k) || !check3x3(i,j,k)) {
      return false;
    }
    return true;
  }

  function isUnique(){
    var count = 0;
    var flag = false;
    function solve2(i, j){
      if (!sudoku[i][j]) {
        for (var k = 1; k < 10; k++){
          if (flag) break;
          if (check(i, j, k)) {
            sudoku[i][j] = k;
            if (j<8) {
              solve2(i, j+1);
              sudoku[i][j] = null;
            }
            else if (i<8) {
              solve2(i+1, 0);
              sudoku[i][j] = null;
            }
            else {
              count++;
              if (count == 2) flag = true;
            }
          }
        }
      }
      else if (j<8) {
        solve2(i, j+1);
      }
      else if (i<8) {
        solve2(i+1, 0);
      }
      else {
        count++;
        if (count == 2) flag = true;
      }
    }
    solve2(0,0);
    return !flag;
  }

  function make1Dimensions(sudoku){
    var array = []
    for (var i = 0; i < 9; i++){
      for (var j = 0; j < 9; j++){
        array.push({'i':i, 'j':j, 'k': sudoku[i][j]});
      }
    }
    return shuffle(array);
  }

  function makeSudoku(){
    var flag = false;
    function solve(i, j){
      if (!sudoku[i][j]) {
        var arr = shuffle([1,2,3,4,5,6,7,8,9]);
        for (var k = 0; k < 9; k++){
          if (flag) break;
          if (check(i, j, arr[k])) {
            sudoku[i][j] = arr[k];
            if (j<8) {
              solve(i, j+1);
              if (!flag) sudoku[i][j] = null;
            }
            else if (i<8) {
              solve(i+1, 0);
              if (!flag) sudoku[i][j] = null;
            }
            else {
              flag = true;
            }
          }
        }
      }
    }
    solve(0,0);
    return flag;
  }

  function makeProblem(sudoku){
    var array = make1Dimensions(sudoku);
    do {
      var tmp = array.pop();
      sudoku[tmp.i][tmp.j] = null;
      if (!isUnique()) {
        sudoku[tmp.i][tmp.j] = tmp.k;
      }
    }
    while (array[0]);
  }
  randomId = Math.floor(Math.random() * 1000) + 1;
  query('SELECT problem, solution FROM sudoku WHERE id=' + randomId)
  .then(function(result){
    response.render('sudokuPlay.ejs', {problem: result[0][0].problem, solution: result[0][0].solution});
  });
});

app.get('/sudoku/solve', function(request, response) {
  response.render('sudokuSolve.ejs');
});

app.post('/insert', function(request, response) {
	var number = request.body.number;
	var title = request.body.title;
	var vocabulary = request.body.vocabulary.toLowerCase();
	var mean = request.body.mean.toLowerCase();
	number == ''? number = null: true;
	title == ''? title = 'null': title = '"'+title+'"';
	for (var i = 0; i < vocabulary.length; i++) {
		vocabulary[i] == ''? vocabulary[i] = 'null': vocabulary[i] = '"'+vocabulary[i]+'"';
		mean[i] == ''? mean[i] = 'null': mean[i] = '"'+mean[i]+'"';
	}
	for (var i = 0; i < vocabulary.length; i++) {
		query('INSERT INTO kenglish VALUES ('+number+','+title+','+vocabulary[i]+','+mean[i]+')');
	}
  	response.render('insert.ejs');
});

app.post('/sudoku/insert', function(request, response) {
  if (!request.body.qty) {
    return response.send('Missing params qty');
  }
  var sudoku = [
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""],
    ["","","","","","","","",""]  
  ];
  var solution = [];

  function checkRow(i, j, k){
    for (var x = 0; x < 9; x++){
      if (sudoku[i][x] == k && x!=j) {
        return false;
      }
    }
    return true;
  }

  function checkCol(i, j, k){
    for (var x = 0; x < 9; x++){
      if (sudoku[x][j] == k && x!=i) {
        return false;
      }
    }
    return true;
  }

  function check3x3(i, j, k){
    for (var m = Math.floor(i/3)*3; m < Math.floor(i/3)*3 + 3; m++){
      for (var n = Math.floor(j/3)*3; n < Math.floor(j/3)*3 + 3; n++){
        if (sudoku[m][n] == k && (m!=i || n!=j)) {
          return false;
        }
      }
    }
    return true;
  }

  function check(i, j, k) {
    if (!checkRow(i,j,k) || !checkCol(i,j,k) || !check3x3(i,j,k)) {
      return false;
    }
    return true;
  }

  function isUnique(){
    var count = 0;
    var flag = false;
    function solve2(i, j){
      if (!sudoku[i][j]) {
        for (var k = 1; k < 10; k++){
          if (flag) break;
          if (check(i, j, k)) {
            sudoku[i][j] = k;
            if (j<8) {
              solve2(i, j+1);
              sudoku[i][j] = null;
            }
            else if (i<8) {
              solve2(i+1, 0);
              sudoku[i][j] = null;
            }
            else {
              count++;
              sudoku[i][j] = null;
              if (count == 2) flag = true;
            }
          }
        }
      }
      else if (j<8) {
        solve2(i, j+1);
      }
      else if (i<8) {
        solve2(i+1, 0);
      }
      else {
        count++;
        if (count == 2) flag = true;
      }
    }
    solve2(0,0);
    return !flag;
  }

  function make1Dimensions(sudoku){
    var array = []
    for (var i = 0; i < 9; i++){
      for (var j = 0; j < 9; j++){
        array.push({'i':i, 'j':j, 'k': sudoku[i][j]});
      }
    }
    return shuffle(array);
  }

  function makeProblem(){
    var array = make1Dimensions(sudoku);
    do {
      var tmp = array.pop();
      sudoku[tmp.i][tmp.j] = null;
      if (!isUnique()) {
        sudoku[tmp.i][tmp.j] = tmp.k;
      }
    }
    while (array[0]);
  }

  function makeSudoku(maxId){
    var count = 0;
    var insertCount = 0;
    var flag = false;
    function solve2(i, j){
      if (!sudoku[i][j]) {
        var arr = shuffle([1,2,3,4,5,6,7,8,9]);
        for (var k = 0; k < 9; k++){
          if (flag) break;
          if (check(i, j, arr[k])) {
            sudoku[i][j] = arr[k];
            if (j<8) {
              solve2(i, j+1);
              sudoku[i][j] = null;
            }
            else if (i<8) {
              solve2(i+1, 0);
              sudoku[i][j] = null;
            }
            else {
              count++;
              var s = JSON.stringify(sudoku);
              for (var t = 0; t < 9; t++){
                solution[t] = sudoku[t].slice();
              }
              makeProblem();
              var p = JSON.stringify(sudoku);
              sudoku = solution;
              solution = [];
              sudoku[i][j] = null;
              query('INSERT INTO sudoku (id, problem, solution) VALUES (' + maxId + count + ',"'+p+'","'+s+'")');
              if (count == (maxId + request.body.qty)) flag = true;
            }
          }
        }
      }
    }
    solve2(0,0);
    return !flag;
  }
  query('SELECT MAX(id) AS maxid FROM sudoku')
  .then(function(result){
    makeSudoku(result[0].maxid);
    response.send('Insert sudoku puzzle successful!!');
  })
});

app.listen(app.get('port'), function() {
  	console.log('Node app is running on port', app.get('port'));
});
