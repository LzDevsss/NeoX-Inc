import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadContent} from '../scripts/sync-content.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../assets/js/config.js', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const section = app.slice(app.indexOf('  /* ---------------- Formulário ---------------- */'), app.indexOf('  /* ---------------- Tela de loading'));

function contactFixture({valid = true, configured = true, honey = ''} = {}) {
  const listeners = {}, windowListeners = {};
  const field = value => ({value, validity: '', setCustomValidity(message) { this.validity = message; }, addEventListener() {}});
  const fields = {'#f-name': field('  Pessoa de teste  '), '#f-email': field('teste@example.com'), '#f-roblox': field(''), '#f-msg': field('Uma mensagem de teste com detalhes suficientes.')};
  const formBtn = {disabled: false}, formStatus = {dataset: {}, textContent: ''};
  const endpoint = configured ? 'https://formsubmit.co/726e5e5dd4b8719fa0f4a332bff1b20b' : '';
  const contactForm = {
    elements: {_honey: {value: honey}},
    addEventListener(name, callback) { listeners[name] = callback; },
    checkValidity() { return valid && Object.values(fields).every(f => !f.validity); },
    reportValidity() { this.reported = true; }
  };
  vm.runInNewContext(section, {
    contactForm, formBtn, formStatus, FORM_ENDPOINT: endpoint, NEOX_CONFIG:{contactApiEnabled:false},
    $: selector => fields[selector],
    dict: () => ({name_short: 'Nome curto', msg_short: 'Mensagem curta', form_continue: 'Confirmar envio'}),
    cleanLine: (value, max) => value.replace(/[\r\n]+/g, ' ').trim().slice(0, max),
    cleanText: (value, max) => value.trim().slice(0, max),
    setFormDisabled: () => { formBtn.disabled = true; },
    window: {addEventListener(name, callback) { windowListeners[name] = callback; }},
    fetch: () => { throw new Error('O formulário não deve fazer AJAX nem repetir POSTs'); }
  }, {timeout: 1000});
  const submit = () => { const event = {prevented: false, preventDefault() { this.prevented = true; }}; listeners.submit(event); return event; };
  return {fields, contactForm, formBtn, formStatus, submit, windowListeners};
}

test('CSP bloqueia scripts inline e mantém os scripts locais acessíveis no Pages', () => {
  const meta = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const header = vercel.headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
  assert.equal(header, `${meta}; frame-ancestors 'none'`);
  assert.match(meta, /script-src 'self'; script-src-attr 'none';/);
  assert.match(meta, /base-uri 'none'/);
  const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  for (const [, attrs, body] of tags) {
    if (attrs.includes('application/ld+json')) { JSON.parse(body); continue; }
    const src = /src="([^"]+)"/.exec(attrs)?.[1];
    assert.ok(src?.startsWith('assets/js/'), 'Usar caminho relativo compatível com /NeoX-Inc/');
    assert.ok(fs.existsSync(new URL(`../${src.split('?')[0]}`, import.meta.url)));
    assert.equal(body.trim(), '');
  }
  assert.ok(!/\son(?:click|load|error|submit)\s*=/i.test(html));
});

test('formulário envia a armadilha ao fornecedor sem desativar CAPTCHA', () => {
  const action = /<form\b[^>]*action="([^"]+)"/.exec(html)[1];
  const ctx = {window: {}};
  vm.runInNewContext(config, ctx);
  assert.equal(ctx.window.NEOX_CONFIG.formEndpoint, action);
  assert.match(action, /^https:\/\/formsubmit\.co\/[a-f0-9]{32}$/);
  assert.match(html, /name="_honey"/);
  assert.ok(!/_captcha|neox-form-last|postTo\(/.test(app + html + config));
  assert.ok(!/<form\b[^>]*novalidate/.test(html));
});

test('envio válido preserva mensagem e aguarda confirmação externa', () => {
  const fixture = contactFixture();
  const message = fixture.fields['#f-msg'].value;
  assert.equal(fixture.submit().prevented, false);
  assert.equal(fixture.fields['#f-name'].value, 'Pessoa de teste');
  assert.equal(fixture.fields['#f-msg'].value, message);
  assert.equal(fixture.formStatus.dataset.state, 'confirm');
  assert.equal(fixture.formBtn.disabled, true);
  assert.equal(fixture.submit().prevented, true, 'Evitar um segundo envio enquanto a página abre');
});

test('mensagem composta de espaços não é enviada', () => {
  const fixture = contactFixture();
  fixture.fields['#f-msg'].value = '                         ';
  assert.equal(fixture.submit().prevented, true);
  assert.equal(fixture.contactForm.reported, true);
  assert.equal(fixture.formBtn.disabled, false);
});

test('e-mail rejeitado pelo navegador não segue para envio', () => {
  const fixture = contactFixture({valid: false});
  assert.equal(fixture.submit().prevented, true);
  assert.equal(fixture.contactForm.reported, true);
});

test('configuração ausente e campo armadilha preenchido impedem envio', () => {
  const disabled = contactFixture({configured: false});
  assert.equal(disabled.submit().prevented, true);
  assert.equal(disabled.formBtn.disabled, true);
  assert.equal(contactFixture({honey: 'bot'}).submit().prevented, true);
});

test('voltar da confirmação restaura o formulário sem declarar sucesso', () => {
  const fixture = contactFixture();
  fixture.submit();
  fixture.windowListeners.pageshow();
  assert.equal(fixture.formBtn.disabled, false);
  assert.equal(fixture.formStatus.textContent, '');
  assert.equal(fixture.submit().prevented, false);
});

test('HTML inicial e traduções em português mantêm o mesmo texto', () => {
  const dictionary = loadContent().i18n;
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  for (const [, , key, text] of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>([^<]*)<\/\1>/gi)) {
    assert.equal(typeof dictionary.pt[key], 'string', key);
    assert.equal(text, escape(dictionary.pt[key]), key);
    assert.equal(typeof dictionary.en[key], 'string', `Tradução inglesa: ${key}`);
  }
});
