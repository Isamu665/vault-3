import { Link } from 'react-router-dom';
export default function PageNotFound() {
  return <main className="p-12 text-center"><h1 className="text-3xl font-bold">Página não encontrada</h1>
    <Link className="text-primary block mt-4" to="/">Voltar ao painel</Link></main>;
}
