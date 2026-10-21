@echo off
cd /d "%~dp0"
echo 打开浏览器访问: http://127.0.0.1:8765/
echo 不要关这个窗口。
py -3 -m http.server 8765 --bind 127.0.0.1
pause
