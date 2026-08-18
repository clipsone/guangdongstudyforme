#!/bin/bash
# 题海战术：批量用豆包生成题目扩充题库
B="https://guangdongstudyforme.vercel.app"
TR=$(curl -s --max-time 20 -X POST "$B/api/auth/login" -H "Content-Type: application/json" -d '{"username":"qfill","password":"qfill123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
YW="7beb3c6d-f91f-43e0-8ee2-35801f9e927c"; SX="8a55fa26-2ebe-4938-981f-f2c9e6438a0a"; YY="409899bc-5ea3-44e5-bb50-02bd711f07c7"
gen() { # $1=subject $2=section $3=type $4=count
  curl -s --max-time 170 -X POST "$B/api/ai/generate-questions" -H "Authorization: Bearer $TR" -H "Content-Type: application/json" -d "{\"subjectId\":\"$1\",\"section\":\"$2\",\"type\":\"$3\",\"count\":$4}" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(('✅ $2 +'+str(d['data']['count'])+'  (${4}题)') if 'data' in d else '❌ $2: '+d.get('error',{}).get('message','')[:80])
"
  sleep 1
}
echo "===== 语文主观题区扩到 8 ====="
for SEC in "文言文翻译:essay" "文言文理解填空:fill" "诗歌鉴赏·手法:essay" "诗歌鉴赏·意境情感:essay" "现代文阅读·论述类主观题:essay" "现代文阅读·文学类赏析:essay" "写作:essay"; do
  gen "$YW" "${SEC%%:*}" "${SEC##*:}" 4
done
echo "===== 数学 ====="
gen "$SX" "填空题" "fill" 4
gen "$SX" "填空题" "fill" 4
gen "$SX" "解答题（22题）" "essay" 4
echo "===== 英语 ====="
gen "$YY" "情景交际" "choice" 5
gen "$YY" "情景交际" "choice" 5
for i in 1 2 3 4 5; do gen "$YY" "阅读理解·第二节" "fill" 1; done
gen "$YY" "语法填空" "fill" 5
gen "$YY" "语法填空" "fill" 5
echo "===== 全部完成 ====="