# 1. Define a imagem base (Uma versão leve do Node.js)
FROM node:18-alpine

# 2. Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# 3. Copia apenas os arquivos de dependência primeiro (otimiza o cache do Docker)
COPY package*.json ./

# 4. Instala as dependências (o Express) DENTRO do container
RUN npm install

# 5. Copia o restante do código da sua máquina para o container
COPY . .

# 6. Expõe a porta que a API vai usar
EXPOSE 3000

# 7. Comando para iniciar a aplicação
CMD ["npm", "start"]