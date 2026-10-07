// Classificação de cada item contra o projeto e o manifesto.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extrairBloco, hash, temLegado } from './render.mjs';

export const PEDEM_DECISAO = ['conflito', 'editado', 'customizado-canon-mudou', 'orfao', 'do-projeto-ausente'];

export function classificar(item, manifesto, projeto) {
  const reg = manifesto.itens[item.id];
  if (reg?.estado === 'excluido') return 'excluido';
  const caminho = join(projeto, item.destino);
  const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : null;
  if (item.tipo === 'semente') return atual == null ? 'novo' : 'igual';
  if (reg?.estado === 'customizado') return reg.hashOrigem === hash(item.fonte) ? 'customizado' : 'customizado-canon-mudou';
  const local = item.tipo === 'bloco' ? (atual == null ? null : extrairBloco(atual)) : atual;
  if (local == null) return item.tipo === 'bloco' && temLegado(atual) ? 'atualizavel' : 'novo';
  const hLocal = hash(local);
  const hNovo = hash(item.conteudo);
  if (!reg) return hLocal === hNovo ? 'igual' : 'conflito';
  if (hLocal !== reg.hash) return 'editado';
  return hLocal === hNovo ? 'igual' : 'atualizavel';
}

export function planejar(itens, manifesto, projeto) {
  const linhas = itens.map((item) => ({ item, classe: classificar(item, manifesto, projeto) }));
  const ids = new Set(itens.map((i) => i.id));
  for (const [id, reg] of Object.entries(manifesto.itens)) {
    if (reg.estado === 'do-projeto')
      linhas.push({ item: { id, destino: reg.destino }, classe: existsSync(join(projeto, reg.destino)) ? 'do-projeto' : 'do-projeto-ausente' });
    else if (!ids.has(id) && reg.estado !== 'excluido') linhas.push({ item: { id, destino: reg.destino }, classe: 'orfao' });
  }
  return linhas;
}
