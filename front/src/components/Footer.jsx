import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand pixel">politiko</div>
        <div className="footer-cols">
          <div className="footer-col">
            <p className="footer-col-title mono">Fonte dos dados</p>
            <p>
              <a href="https://divulgacandcontas.tse.jus.br" target="_blank" rel="noopener noreferrer">
                TSE · Divulga Contas
              </a>
            </p>
            <p>Eleições Municipais 2024</p>
            <p>Coleta via API pública do TSE</p>
          </div>
          <div className="footer-col">
            <p className="footer-col-title mono">Sobre</p>
            <p>Dados de prestação de contas dos partidos à Justiça Eleitoral.</p>
            <p>Atualizado após encerramento das contas (nov. 2024).</p>
          </div>
          <div className="footer-col">
            <p className="footer-col-title mono">Aviso</p>
            <p>Projeto independente de interesse público.</p>
            <p>Não somos filiados ao TSE ou a qualquer partido.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="mono">dados abertos · uso livre</span>
        </div>
      </div>
    </footer>
  )
}
