import express from "express"
import path from "path"
const app = express()

app.set("views", path.join(__dirname, "../views"));
app.set('viewengine', 'ejs');

app.get('/', (req, res) => {
	res.render('index.ejs');
})

app.listen(8080, () => {
	console.log('started')
})
