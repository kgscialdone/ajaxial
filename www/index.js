if(document.querySelector('.toc-wrapper')) {
  for(let heading of document.querySelectorAll('article :is(h2,h3,h4,h5,h6)')) {
    heading.id = heading.innerText.toLowerCase()
      .replace(/\s+/g,'-')
      .replace(/[^\w-]+/g,'')
      .replace(/--+/g,'-')
    document.querySelector('.toc-wrapper nav').append(document.createRange().createContextualFragment(
      `<a href="#${heading.id}" style="--level: ${heading.nodeName[1]-2}">${heading.innerText}</a>`))
  }
}

for(let block of document.querySelectorAll('script[type="codeblock"]')) {
  let code = document.createElement('code')
  code.classList.add('block', `language-${block.dataset.lang ?? 'html'}`, ...block.classList)
  let content = block.textContent.replace(/^\n+/,''), indent = content.length - content.trimStart().length
  code.textContent = content
    .replaceAll('\n','␊').replaceAll(new RegExp(`(^|(?<=␊))\\s{1,${indent}}`,'g'),'')
    .replaceAll('␊','\n').replaceAll('␛','').replaceAll('␋',Ajaxial.version)
  block.replaceWith(code)
}
for(let code of document.querySelectorAll('code.block'))
  hljs.highlightElement(code)