// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import {app} from './app.js'
dotenv.config({
    path: './.env'
})

try {
    app.listen(process.env.VITE_PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
} catch (err) {
    console.log("MONGO db connection failed !!! ", err);
}







