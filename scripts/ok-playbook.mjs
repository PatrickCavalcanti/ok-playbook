#!/usr/bin/env node
// ok-playbook — parte determinística da skill: plan | apply | status.
// Contrato: última linha `OK …` (exit 0) ou `FALTA: …` (exit 1).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogo } from './lib/catalogo.mjs';
import { gravarManifesto, lerManifesto, ARQUIVO } from './lib/manifesto.mjs';
import { PEDEM_DECISAO, planejar } from './lib/plano.mjs';
import { adaptar, hash, inserirBloco } from './lib/render.mjs';
import { lerSettings, mesclarSettings } from './lib/settings.mjs';

const RAIZ_SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FLAGS = new Set(['--projeto', '--so', '--manter', '--do-projeto', '--sem']);

function sair(linha, codigo) { console.log(linha); process.exit(codigo); }

function args(argv) {
  const [cmd, ...resto] = argv;
  const o = { cmd, so: [], manter: [], doProjeto: [], sem: [] };
  for (let i = 0; i < resto.length; i += 2) {
    const [f, v] = [resto[i], resto[i + 1]];
    if (!FLAGS.has(f) || v == null) sair(`FALTA: flag desconhecida ou sem valor: ${f}`, 1);
    if (f === '--projeto') o.projeto = resolve(v);
    else o[{ '--so': 'so', '--manter': 'manter', '--do-projeto': 'doProjeto', '--sem': 'sem' }[f]] = v.split(',').filter(Boolean);
  }
  if (!['plan', 'apply', 'status'].includes(cmd)) sair('FALTA: comando — use plan | apply | status --projeto <dir>', 1);
  if (!o.projeto) sair('FALTA: --projeto <dir>', 1);
  return o;
}

function versao() { return readFileSync(join(RAIZ_SKILL, 'VERSION'), 'utf8').trim(); }
function origem() {
  try { return execFileSync('git', ['-C', RAIZ_SKILL, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return 'desconhecida'; }
}

function aplicar(o, m, itens, settings) {
  const v = versao();
  let escritos = 0;
  for (const { item, classe } of planejar(itens, m, o.projeto)) {
    if (!item.tipo) continue;
    const { id } = item;
    if (o.sem.includes(id)) { m.itens[id] = { destino: item.destino, estado: 'excluido' }; continue; }
    if (o.manter.includes(id)) { m.itens[id] = { destino: item.destino, origem: item.origem, estado: 'customizado', hashOrigem: hash(item.fonte) }; continue; }
    const escrever = classe !== 'marcador-quebrado' && (classe === 'novo' || classe === 'atualizavel' || o.so.includes(id));
    if (escrever) {
      const caminho = join(o.projeto, item.destino);
      try {
        mkdirSync(dirname(caminho), { recursive: true });
        const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : null;
        writeFileSync(caminho, item.tipo === 'bloco' ? inserirBloco(atual, item.conteudo, v) : adaptar(item.conteudo, atual));
      } catch (e) {
        // o que já foi escrito fica registrado; o resto o próximo apply refaz
        m.playbook = { versao: v, origem: origem() };
        gravarManifesto(o.projeto, m);
        sair(`FALTA: falha ao escrever ${item.destino}: ${e.message}`, 1);
      }
      escritos++;
    }
    if (item.tipo !== 'semente' && (escrever || classe === 'igual'))
      m.itens[id] = { destino: item.destino, origem: item.origem, estado: 'materializado', hash: hash(item.conteudo), hashOrigem: hash(item.fonte) };
  }
  for (const p of o.doProjeto) m.itens[`projeto:${p}`] = { destino: p, estado: 'do-projeto' };
  m.playbook = { versao: v, origem: origem() };
  if (settings) {
    const snippet = join(RAIZ_SKILL, 'assets/settings-snippet.json');
    if (existsSync(snippet)) mesclarSettings(settings, JSON.parse(readFileSync(snippet, 'utf8')), m);
  } else if (o.sem.includes('settings')) m.itens.settings = { estado: 'excluido' };
  gravarManifesto(o.projeto, m);
  return escritos;
}

const o = args(process.argv.slice(2));
const m = lerManifesto(o.projeto);
if (!m) sair(`FALTA: ${ARQUIVO} ausente em ${o.projeto} — crie com { "paths": { … } } (modo configurar da skill)`, 1);
const itens = catalogo(RAIZ_SKILL, m.paths);

if (o.cmd === 'apply') {
  // tudo que pode falhar acontece antes da primeira escrita
  const conhecidos = new Set([...itens.map((i) => i.id), ...Object.keys(m.itens)]);
  for (const id of [...o.so, ...o.manter, ...o.sem])
    if (!conhecidos.has(id) && !(id === 'settings' && o.sem.includes(id))) sair(`FALTA: id desconhecido: ${id}`, 1);
  let settings = null;
  if (!o.sem.includes('settings') && m.itens.settings?.estado !== 'excluido') {
    try { settings = lerSettings(o.projeto); }
    catch (e) { sair(`FALTA: .claude/settings.json não é JSON válido (${e.message}) — corrija ou use --sem settings`, 1); }
  }
  const n = aplicar(o, m, itens, settings);
  const pend = planejar(itens, m, o.projeto).filter((l) => PEDEM_DECISAO.includes(l.classe));
  for (const l of pend) console.log(`${l.classe}\t${l.item.id}\t${l.item.destino}`);
  sair(pend.length ? `FALTA: ${pend.length} itens pedem decisão (use --so / --manter / --sem / --do-projeto)` : `OK aplicado: ${n} escritos`, pend.length ? 1 : 0);
}

const linhas = planejar(itens, m, o.projeto);
const contagem = {};
for (const l of linhas) {
  contagem[l.classe] = (contagem[l.classe] ?? 0) + 1;
  if (o.cmd === 'plan' || l.classe !== 'igual') console.log(`${l.classe}\t${l.item.id}\t${l.item.destino}`);
}
const resumo = Object.entries(contagem).map(([k, v]) => `${v} ${k}`).join(', ');
if (o.cmd === 'plan') sair(`OK plano: ${resumo}`, 0);
const drift = linhas.filter((l) => !['igual', 'customizado', 'excluido', 'do-projeto'].includes(l.classe));
sair(drift.length ? `FALTA: drift — ${resumo}` : `OK sem drift: ${resumo}`, drift.length ? 1 : 0);
