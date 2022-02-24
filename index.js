import profile from './profile.json'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  const query = request.url.split('/').slice(-1)[0]
  if (query.length === 0) {
    return new Response("I'm a teapot", {
      status: 418,
    })
  }
  let member = profile['data'].filter(
    member => member['english_name'] === query.split('.').join(' '),
  )
  if (member.length === 0) {
    return new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    })
  }

  member = member[0]
  const resp = await fetch(
    `https://www.nogizaka46.com/s/n46/api/json/diary?member_id=${member.code}&cd=MEMBER&rw=10`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
    .then(res => {
      if (!res.ok) {
        throw new Error("Can't get member's blog")
      }
      return res.json()
    })
    .catch(err => {
      console.error(err)
      return new Response(`<h1>${err.message}</h1>`, {
        status: 500,
        statusText: 'Internal Server Error',
      })
    })

  const blogs = resp['blog']
  const rss = await makeRss(blogs, member)

  return new Response(rss, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
    },
  })
}

async function makeRss(blogs, member) {
  const deployUrl = 'https://nogizaka46-blog-rss.kasper.workers.dev/'
  const items = blogs.map(blog => {
    return `<item>
    <title><![CDATA[${blog.title}]]></title>
    <pubDate>${blog.pubdate}</pubDate>
    <guid isPermaLink="false">${blog.link}</guid>
    <link>${blog.link}</link>
    <author><![CDATA[${blog.creator}]]></author>
</item>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
    <channel>
        <title><![CDATA[${member.name}'s blog]]></title>
        <link>${deployUrl + member.english_name}</link>
        <atom:link href="${deployUrl +
          member.english_name}" rel="self" type="application/rss+xml" />
        <description><![CDATA[${member.name}'s blog]]></description>
        <generator>nogizaka46-blog-rss</generator>
        <webMaster>kasper4649</webMaster>
        <language>jp</language>
        <lastBuildDate>${new Date().toGMTString()}</lastBuildDate>
        <ttl>300</ttl>
        ${items.join('\n')}
    </channel>
</rss>`
}
