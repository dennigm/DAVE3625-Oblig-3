// Run with: node check.cjs. Checks application logic with a minimal DOM substitute.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
class Element {
  constructor() { this.children=[]; this.value=''; this.checked=false; this.dataset={}; this.style={setProperty(){}}; this.attributes={}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children=nodes; }
  setAttribute(key,value) { this.attributes[key]=value; }
  addEventListener() {}
  focus() {}
  showModal() { this.open=true; }
  close() { this.open=false; }
}
let saved=null;
function start() {
  const nodes=new Map();
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>new Element(),createTextNode:text=>({textContent:text})},localStorage:{getItem:()=>saved,setItem:(_,value)=>saved=value},setTimeout:()=>0,clearTimeout(){},confirm:()=>true});
  vm.runInContext(source,context);
  return {get,run:code=>vm.runInContext(code,context)};
}
const app=start(), submit={preventDefault(){}};
assert.equal(app.get('count-cook').textContent,1,'Example omelette is ready');
assert.equal(app.get('count-recipes').textContent,4);
app.get('pantry-input').value='  EGG  ';
app.get('pantry-form').onsubmit(submit);
assert.equal(app.get('count-pantry').textContent,5,'Duplicate ignored');
for(const value of [' LØK ','olje']) {app.get('pantry-input').value=value;app.get('pantry-form').onsubmit(submit);}
assert.equal(app.get('count-cook').textContent,2,'Tomato pasta becomes ready');
app.get('new-recipe').onclick();
app.get('recipe-name').value='<img src=x onerror=alert(1)>';
app.get('recipe-ingredients').value='Egg, egg, OST';
app.get('recipe-form').onsubmit(submit);
assert.equal(app.get('count-recipes').textContent,5);
assert.equal(app.get('count-cook').textContent,3);
assert.equal(app.run('state.recipes.at(-1).ingredients.length'),2,'Ingredient normalization');
assert.equal(app.get('recipe-grid').children.at(-1).children[1].children[1].textContent,'<img src=x onerror=alert(1)>','User content is text');
app.run('openRecipe(state.recipes.at(-1))');
app.get('recipe-ingredients').value='egg, ris';
app.get('recipe-form').onsubmit(submit);
assert.equal(app.get('count-cook').textContent,2,'Editing updates matching');
app.get('only-ready').checked=true;
app.get('only-ready').onchange();
assert.equal(app.get('cook-grid').children.length,2,'Ready-only filter');
const reload=start();
assert.equal(reload.get('count-recipes').textContent,5,'Recipes survive reload');
assert.equal(reload.get('count-pantry').textContent,7,'Pantry survives reload');
reload.run("state.pantry=state.pantry.filter(i=>i!=='egg');save()");
assert.equal(reload.get('count-cook').textContent,1,'Removing ingredient updates matching');
reload.get('recipe-grid').children.at(-1).children[2].children[1].children[1].onclick();
assert.equal(reload.get('count-recipes').textContent,4,'Delete works');
console.log('Passed: matching, duplicates, normalization, creation, editing, deletion, filtering, text safety and storage reload.');
