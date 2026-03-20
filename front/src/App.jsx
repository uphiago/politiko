import { useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Banner from './components/Banner'
import Ranking from './components/Ranking'
import Destino from './components/Destino'
import Empresas from './components/Empresas'
import GastosPorTipo from './components/GastosPorTipo'
import Beneficiarios from './components/Beneficiarios'
import Footer from './components/Footer'

export default function App() {
  useEffect(() => {
    const els = document.querySelectorAll('section')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
      }),
      { threshold: 0.04 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="app">
      <Header />
      <Banner />
      <Ranking />
      <Destino />
      <Empresas />
      <GastosPorTipo />
      <Beneficiarios />
      <Footer />
    </div>
  )
}
