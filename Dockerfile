# Etapa 1: Construcción (Builder)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de definición de paquetes para aprovechar el caché de Docker
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Instalar todas las dependencias
RUN npm install

# Copiar el resto del código fuente del proyecto
COPY . .

# Compilar los recursos del frontend (Vite)
RUN npm run build

# Etapa 2: Imagen de producción ligera
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias de node y archivos necesarios desde el builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Exponer el puerto por defecto
EXPOSE 3000

# Definir variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar la aplicación
CMD ["node", "server/index.js"]
