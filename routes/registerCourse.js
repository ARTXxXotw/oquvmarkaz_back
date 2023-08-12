var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs =require("fs")
const pool = require("../db")
var {ensureToken,ensureTokenSuper,ensureTokenTeacher,superTeacher }=require("../token/token.js")

router.get("/super/registerCourse", (req, res) => {   
    pool.query("SELECT * FROM registerCourse", (err, result) => {
        if (!err) {

            res.status(200).send(result.rows)

        } else {
            res.send(err)
        }
    })
})

router.get('/super/registerCourse/:id', (req, res) => {
    
    pool.query("SELECT * FROM registerCourse where id=$1", [req.params.id], (err, result) => {
        if (!err) {
            res.status(200).send(result.rows)
        } else {
            res.status(400).send(err)
        }
    })
})

router.post("/super/registerCourse",ensureTokenSuper, (req, res) => {
    const body = req.body;
        pool.query('INSERT INTO registerCourse (course,total_mark,completed_themes,rating,users) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [body.course,body.total_mark,body.completed_themes,body.rating,body.users],
         (err, result) => {
            if (err) {
                res.status(400).send(err);
            } else {
                res.status(201).send("Created");
            }
        });
});

router.delete("/super/registerCourse/:id",ensureTokenSuper, (req, res) => {
    const id = req.params.id
    pool.query('DELETE FROM registerCourse WHERE id = $1', [id], (err, result) => {
        if (err) {
            res.status(400).send(err)
        } else {
            res.status(200).send("Deleted")
        }
    })
})
router.put("/super/registerCourse/:id",ensureTokenSuper, (req, res) => {
    const id = req.params.id
    const body = req.body
    pool.query(
        'UPDATE registerCourse SET course=$1,total_mark=$2,completed_themes=$3,rating=$4,users=$5 WHERE id = $6',
        [body.course,body.total_mark,body.completed_themes,body.rating,body.users,id],
        (err, result) => {
            if (err) {
                res.status(400).send(err)
            } else {
                res.status(200).send("Updated")
            }
        }
    )
})
router.put("completed_themes/registerCourse/:id",ensureToken, (req, res) => {
    const id = req.params.id
    const body = req.body
    pool.query(
        'UPDATE registerCourse SET completed_themes=$1 WHERE id = $2',
        [body.completed_themes,id],
        (err, result) => {
            if (err) {
                res.status(400).send(err)
            } else {
                res.status(200).send("Updated")
            }
        }
    )
})

router.put("/rating/registerCourse/:id",ensureToken, (req, res) => {
    const id = req.params.id
    const body = req.body
    pool.query(
        'UPDATE registerCourse SET rating=$1 WHERE id = $2',
        [body.rating,id],
        (err, result) => {
            if (err) {
                res.status(400).send(err)
            } else {
                res.status(200).send("Updated")
            }
        }
    )
})
router.get("/super/registerCourse",ensureToken, (req,res)=>{   
     pool.query("SELECT * FROM registerCourse", (err, result) => {
        if (!err) {
            res.status(200).send(result.rows)
        } else {
            res.send(err)
        }
    })
})

router.get('/mycourse/:id', ensureToken , (req,res)=>{
    pool.query("SELECT * FROM registerCourse where users=$1", [req.params.id], (err, result) => {
        if (!err) {
            res.status(200).send(result.rows)
        } else {
            res.status(400).send(err)
        }
    })
})


module.exports = router;