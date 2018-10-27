const request = require('request-promise')
const _ = require('lodash')
const moment = require('moment')

const mongoose = require('../mongoose')
const Article = mongoose.model('Article')
const Category = mongoose.model('Category')
const general = require('./general')

const list = general.list
const item = general.item

const marked = require('marked')
const hljs = require('highlight.js')
marked.setOptions({
    highlight(code) {
        return hljs.highlightAuto(code).value
    },
    breaks: true
})

/**
 * 管理时, 获取文章列表
 * @method
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
exports.getList = async (req, res) => {
    const { id } = req.query
    let { limit, page } = req.query
    page = parseInt(page, 10)
    limit = parseInt(limit, 10)
    if (!page) page = 1
    if (!limit) limit = 10
    const json = {
        code: 200,
        data: {
            total: 10000,
            hasNext: 1,
            hasPrev: page > 1
        }
    }
    const qs = {
        offset: (page - 1) * limit,
        items: limit,
        topic: id
    }
    console.log('qs', qs)
    const articles = await request.get('http://45.32.124.158/v/1/ds/article/ls', {
        qs,
        json: true
    })
    json.data.list = _.map(articles, article => {
        return {
            _id: article.id,
            update_date: moment(article.created).format('YYYY-MM-DD HH:mm:ss'),
            category_name: article.topic.title,
            timestamp: article.created,
            content: article.teaser,
            comment_count: article.comment,
            visit: article.view,
            ...article
        }
    })
    res.json(json)
    // list(req, res, Article, '-update_date')
}

/**
 * 管理时, 获取单篇文章
 * @method
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
exports.getItem = async (req, res) => {
    const _id = req.query.id
    const user_id = req.cookies.userid || req.headers.userid
    if (!_id) {
        res.json({
            code: -200,
            message: '参数错误'
        })
    }
    const article = await request.get(`http://45.32.124.158/v/1/ds/article/item/${_id}`, {
        json: true
    })
    res.json({
        code: 200,
        data: {
            _id: article.id,
            update_date: moment(article.created).format('YYYY-MM-DD HH:mm:ss'),
            category_name: article.domain,
            timestamp: article.created,
            content: article.teaser,
            comment_count: article.comment,
            visit: article.view,
            html: _.map(article.paragraph, p => {
                const content = []
                if (p.photo) {
                    content.push(`<div style="text-align: center"><img src="${p.photo}" alt="${p.title}" /></div>`)
                }
                content.push(p.passage)
                return content.join('')
            }).join(''),
            ...article
        }
    })
}

/**
 * 发布文章
 * @method
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
exports.insert = (req, res) => {
    const { category, content, title } = req.body
    const html = marked(content)
    const arr_category = category.split('|')
    const data = {
        title,
        category: arr_category[0],
        category_name: arr_category[1],
        content,
        html,
        visit: 0,
        like: 0,
        comment_count: 0,
        creat_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        update_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        is_delete: 0,
        timestamp: moment().format('X')
    }
    Article.createAsync(data)
        .then(result => {
            return Category.updateOneAsync({ _id: arr_category[0] }, { $inc: { cate_num: 1 } }).then(() => {
                return res.json({
                    code: 200,
                    message: '发布成功',
                    data: result
                })
            })
        })
        .catch(err => {
            res.json({
                code: -200,
                message: err.toString()
            })
        })
}

/**
 * 管理时, 删除文章
 * @method
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
exports.deletes = (req, res) => {
    const _id = req.query.id
    Article.updateOneAsync({ _id }, { is_delete: 1 })
        .then(() => {
            return Category.updateOneAsync({ _id }, { $inc: { cate_num: -1 } }).then(result => {
                res.json({
                    code: 200,
                    message: '更新成功',
                    data: result
                })
            })
        })
        .catch(err => {
            res.json({
                code: -200,
                message: err.toString()
            })
        })
}

/**
 * 管理时, 恢复文章
 * @method
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
exports.recover = (req, res) => {
    const _id = req.query.id
    Article.updateOneAsync({ _id }, { is_delete: 0 })
        .then(() => {
            return Category.updateOneAsync({ _id }, { $inc: { cate_num: 1 } }).then(() => {
                res.json({
                    code: 200,
                    message: '更新成功',
                    data: 'success'
                })
            })
        })
        .catch(err => {
            res.json({
                code: -200,
                message: err.toString()
            })
        })
}

/**
 * 管理时, 编辑文章
 * @method
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
exports.modify = (req, res) => {
    const { id, category, category_old, content } = req.body
    const html = marked(content)
    const data = {
        title: req.body.title,
        category: req.body.category,
        category_name: req.body.category_name,
        content,
        html,
        update_date: moment().format('YYYY-MM-DD HH:mm:ss')
    }
    Article.findOneAndUpdateAsync({ _id: id }, data, { new: true })
        .then(result => {
            if (category !== category_old) {
                Promise.all([
                    Category.updateOneAsync({ _id: category }, { $inc: { cate_num: 1 } }),
                    Category.updateOneAsync({ _id: category_old }, { $inc: { cate_num: -1 } })
                ]).then(() => {
                    res.json({
                        code: 200,
                        message: '更新成功',
                        data: result
                    })
                })
            } else {
                res.json({
                    code: 200,
                    message: '更新成功',
                    data: result
                })
            }
        })
        .catch(err => {
            res.json({
                code: -200,
                message: err.toString()
            })
        })
}
