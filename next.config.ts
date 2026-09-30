import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fixa a raiz do Turbopack na pasta do projeto.
  //
  // Sem isto o Next PROCURA um package-lock.json subindo as pastas e usa o primeiro que
  // achar como raiz. Em 18/09 apareceu um package-lock.json solto em C:\Users\Robson (de um
  // `npm install` avulso) e a raiz passou a ser a pasta do usuário. Os nomes de arquivo do
  // build ficaram longos ("Documents_Marketing RP_Sistemas para óticas_...") e o Turbopack
  // entra em pânico ao encurtá-los no meio do "ó": o build quebrou sem nenhuma mudança de código.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
