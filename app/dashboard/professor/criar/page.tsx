import { CriarConteudoClient } from "./criar-conteudo-client"

export default async function CriarConteudoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  return <CriarConteudoClient initialEditId={edit ?? null} />
}
