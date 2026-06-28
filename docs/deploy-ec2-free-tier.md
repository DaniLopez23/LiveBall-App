# Deploy sencillo en una EC2 Free Tier

Esta guia despliega LiveBall en una unica EC2 con Docker Compose. No usa ALB,
EFS, ECR, Route 53, RDS ni CloudWatch.

La entrada publica es el puerto 80 de `frontend-react`. Nginx sirve React y
reenvia `/api` y los WebSockets al backend a traves de la red privada de Docker.
El puerto 8000 del backend solo se publica en `127.0.0.1` de la instancia.

Recomendacion para esta app:

- Usa `t3.small` si aparece como elegible.
- Si tu cuenta antigua solo permite `t3.micro`, tambien puede servir para una
  demo, pero el build sera lento. El script incluido crea 2 GiB de swap.
- Usa arquitectura `x86_64`, no `t4g` ARM, para evitar sorpresas con las
  dependencias cientificas de Python.

Configura una alerta de facturacion. Una IPv4 publica tiene precio propio y,
fuera de creditos o beneficios aplicables, cuesta `0.005 USD/h`, unos
`3.60 USD/mes`. Consulta [precios VPC](https://aws.amazon.com/es/vpc/pricing/).

## 2. Crear la instancia

En **EC2 > Launch instance**:

1. Nombre: `liveball-free-tier`.
2. AMI: **Ubuntu Server 24.04 LTS**, `x86_64`, marcada como Free Tier eligible.
3. Tipo: `t3.small` si es elegible; en caso contrario, el tipo elegible de tu cuenta.
4. Crea o selecciona un key pair `.pem`.
5. Activa una IPv4 publica.
6. Almacenamiento: `30 GiB`, `gp3`, sin volumen adicional.
7. Security group de entrada:
   - SSH, TCP `22`, origen **My IP**.
   - HTTP, TCP `80`, origen `0.0.0.0/0`.
   - No abras `8000` ni `5173`.

Los 30 GB de EBS estan dentro de la oferta heredada; las cuentas nuevas usan
creditos. Comprueba los detalles actuales en [precios EBS](https://aws.amazon.com/ebs/pricing/).

## 3. Conectarse

Desde tu equipo Windows, abre PowerShell o Windows Terminal y sustituye la ruta
de la clave y la IP:

```powershell
ssh -i C:\Users\TU_USUARIO\Downloads\liveball.pem ubuntu@IP_PUBLICA
```

Si prefieres usar la clave desde la carpeta actual, la ruta puede ser
`.\\liveball.pem`.

Si ves el error `Bad permissions` o `UNPROTECTED PRIVATE KEY FILE`, fija los
permisos de la clave antes de volver a conectar:

```powershell
icacls "C:\Users\danis\Desktop\AWS\liveball-key.pem" /inheritance:r
icacls "C:\Users\danis\Desktop\AWS\liveball-key.pem" /remove:g "BUILTIN\Usuarios"
icacls "C:\Users\danis\Desktop\AWS\liveball-key.pem" /grant:r "$env:USERNAME:(R)"
```

En Windows no necesitas ejecutar `chmod`. Lo importante es que el archivo `.pem`
no quede legible para otros usuarios del sistema.

## 4. Descargar el proyecto

En la EC2:

```bash
sudo mkdir -p /opt/liveball
sudo chown ubuntu:ubuntu /opt/liveball
git clone https://github.com/DaniLopez23/LiveBall-App /opt/liveball
cd /opt/liveball
```

Para un repositorio privado, usa una deploy key o un token con acceso de solo
lectura. No guardes credenciales dentro de `.env` ni del repositorio.

## 5. Instalar Docker y crear swap

```bash
cd /opt/liveball
sudo bash deploy/setup-ec2-ubuntu.sh
exit
```

Vuelve a conectarte por SSH para que se aplique el grupo `docker`:

```bash
ssh -i liveball.pem ubuntu@IP_PUBLICA
docker compose version
```

El script sigue la instalacion oficial de
[Docker Engine para Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
e instala el plugin de Compose.

## 6. Configurar LiveBall

```bash
cd /opt/liveball
cp .env.ec2.example .env
```

No escribas la IP publica en `VITE_API_URL` ni `VITE_WS_BASE_URL`. Vacias, las
URLs se calculan a partir del host actual y funcionan tanto con IP como con un
dominio futuro.

## 7. Construir sin agotar la RAM

Construye una imagen cada vez:

```bash
docker compose build match-simulator
docker compose build backend-fastapi
docker compose build frontend-react
```

En una `t3.micro` estos builds pueden tardar varios minutos. La swap evita que
los procesos de TypeScript, pip o Docker sean terminados por falta de memoria.

## 8. Levantar la aplicacion

```bash
docker compose up -d
docker compose ps
```

Comprobaciones desde la EC2:

```bash
curl http://127.0.0.1/health
curl http://127.0.0.1/ready
curl http://127.0.0.1/api/v1/games
docker compose logs --tail=50 backend-fastapi
docker compose logs --tail=50 match-simulator
```

Resultados esperados:

- `/health` devuelve `{"status":"ok"}`.
- `/ready` devuelve `{"status":"ready", ...}`.
- `/api/v1/games` devuelve partidos.
- Los logs del backend muestran lecturas F24/F9.

Abre en el navegador:

```text
http://IP_PUBLICA
```

React, HTTP API y WebSocket usan ese mismo origen. Este despliegue sencillo usa
HTTP; no introduzcas contrasenas ni informacion sensible. HTTPS requiere un
dominio y un proxy con certificado y se puede incorporar mas adelante.

## 9. Arranque automatico

```bash
cd /opt/liveball
sudo cp deploy/liveball.service /etc/systemd/system/liveball.service
sudo systemctl daemon-reload
sudo systemctl enable liveball.service
sudo systemctl start liveball.service
sudo systemctl status liveball.service
```

Frontend y backend tienen `restart: unless-stopped`. El simulador usa
`restart: on-failure`: no se repite indefinidamente cuando termina con exito,
pero vuelve a ejecutarse despues de reiniciar la instancia mediante systemd.

## 10. Actualizar la aplicacion

```bash
cd /opt/liveball
git pull
docker compose build match-simulator
docker compose build backend-fastapi
docker compose build frontend-react
docker compose up -d
docker image prune -f
```

`docker image prune -f` elimina capas sin usar y ayuda a conservar espacio.

## 11. Detener o eliminar

Detener conservando el volumen XML:

```bash
docker compose stop
```

Eliminar contenedores conservando el volumen:

```bash
docker compose down
```

No uses `docker compose down -v` salvo que quieras borrar todos los XML del
volumen compartido. Al terminar la prueba, detén o termina la EC2 y revisa que
no queden IPv4 Elastic ni volumenes EBS sin usar generando coste.
