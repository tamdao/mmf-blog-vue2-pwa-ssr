const request = require('request-promise')
const _ = require('lodash')
const moment = require('moment')

/**
 * 前台浏览时, 获取文章列表
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
}

/**
 * 前台浏览时, 获取单篇文章
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
    console.log('req.query.id', req.query.id, req.query)
    const article = await request.get(`http://45.32.124.158/v/1/ds/article/item/${_id}`, {
        json: true
    })
    console.log('article', article)
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

exports.getTrending = async (req, res) => {
    const limit = 5
    const qs = {
        offset: 0 * limit,
        items: limit,
        queue: 'hot'
    }
    console.log('qs', qs)
    const articles = await request.get('http://45.32.124.158/v/1/ds/article/ls', {
        qs,
        json: true
    })
    res.json({
        code: 200,
        data: {
            list: articles
        }
    })
}
