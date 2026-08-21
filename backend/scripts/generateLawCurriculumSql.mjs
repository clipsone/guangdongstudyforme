import { writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
const curriculum = [["法理学","法律本体与法律规范",["法的概念与特征","法律规范的结构","法律渊源与效力","法律责任基础"]],["宪法学","国家基本制度",["人民主权与国家性质","基本权利与义务","国家机构体系","宪法监督"]],["民法总论","民事法律关系",["民事主体","民事法律行为","代理制度","诉讼时效"]],["民法分论","合同与侵权",["合同成立与效力","合同履行与违约","物权变动","侵权责任构成"]],["刑法总论","犯罪论体系",["犯罪构成","故意与过失","正当防卫与紧急避险","共同犯罪"]],["刑法分论","常见犯罪类型",["财产犯罪","人身犯罪","职务犯罪","罪数与刑罚"]],["行政法与行政诉讼法","行政行为与救济",["行政行为合法性","行政许可与处罚","行政复议","行政诉讼受案范围"]],["民事诉讼法","民事程序基础",["管辖","当事人与证据","审判程序","执行程序"]],["刑事诉讼法","刑事程序基础",["侦查与强制措施","辩护制度","证据规则","审判程序"]],["商法与经济法","市场主体与交易",["公司法基础","票据与商事交易","消费者权益保护","市场竞争规则"]],["知识产权法","智力成果保护",["著作权","专利权","商标权","侵权救济"]],["法律文书写作与案例分析","法律实务训练",["法律检索与法条引用","案例事实提炼","法律论证结构","诉讼文书基本格式"]]];
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "''");
const text = (s) => "'" + esc(s) + "'";
const ident = (s) => crypto.createHash('md5').update(s).digest('hex');
const json = (v) => text(JSON.stringify(v)) + '::jsonb';
const sql = ['BEGIN;'];
for (let ci = 0; ci < curriculum.length; ci++) {
  const course = curriculum[ci][0]; const desc = curriculum[ci][1]; const points = curriculum[ci][2];
  const chapterCode = 'LAW-' + String(ci + 1).padStart(2, '0'); const chapterId = ident('chapter:' + chapterCode);
  sql.push('INSERT INTO "Chapter" ("id","subjectId","name","code","order","description","createdAt","updatedAt") SELECT ' + text(chapterId) + ',s."id",' + text(course) + ',' + text(chapterCode) + ',' + (ci + 1) + ',' + text(desc) + ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "Subject" s WHERE s."code"=' + text('LAW') + ' AND NOT EXISTS (SELECT 1 FROM "Chapter" WHERE "code"=' + text(chapterCode) + ');');
  for (let pi = 0; pi < points.length; pi++) {
    const point = points[pi]; const pointCode = chapterCode + '-' + String(pi + 1).padStart(2, '0'); const pointId = ident('point:' + pointCode);
    sql.push('INSERT INTO "KnowledgePoint" ("id","chapterId","code","name","level","difficulty","summary","createdAt","updatedAt") SELECT ' + text(pointId) + ',' + text(chapterId) + ',' + text(pointCode) + ',' + text(point) + ',2,' + (ci % 3 + 2) + ',' + text(course + '：' + point + '。掌握概念、构成要件、法律后果、典型案例和易错点。') + ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM "KnowledgePoint" WHERE "code"=' + text(pointCode) + ');');
    const qs = [['choice','单项选择题',['A. 仅凭直觉判断','B. 结合构成要件与法律后果分析','C. 只看主观愿望','D. 只看最终结果'],'B',course + '｜' + point + '：下列哪项最符合本知识点的基本分析方法？'],['fill','名词解释/简答题',null,'按照规则、要件、事实和结论作答。',course + '｜' + point + '：请解释该知识点的核心概念、构成要件或法律后果。'],['essay','案例分析题',null,'按照事实识别、法律关系、适用规则、法律后果和结论作答。',course + '｜' + point + '案例分析：请按事实识别、法律关系、适用规则、法律后果和结论作答。']];
    for (const q of qs) { const qid = ident('question:' + q[4]); const section = course + '·' + q[1]; const solution = { analysis: '本科法学课程生成练习题，来源为 course-generated；不代表官方真题。建议按规则、要件、事实对应、结论作答。', knowledgePoint: point }; const opts = q[2] ? json(q[2]) : 'NULL';
      sql.push('INSERT INTO "Question" ("id","subjectId","type","section","stem","options","answer","solution","difficulty","source","status","createdAt","updatedAt") SELECT ' + text(qid) + ',s."id",' + text(q[0]) + ',' + text(section) + ',' + text(q[4]) + ',' + opts + ',' + text(q[3]) + ',' + json(solution) + ',' + (ci % 3 + 2) + ',' + text('course-generated') + ',' + text('active') + ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "Subject" s WHERE s."code"=' + text('LAW') + ' AND NOT EXISTS (SELECT 1 FROM "Question" WHERE "id"=' + text(qid) + ');');
      sql.push('INSERT INTO "QuestionKnowledge" ("id","questionId","knowledgePointId") SELECT ' + text(ident('qk:' + qid + ':' + pointId)) + ',' + text(qid) + ',' + text(pointId) + ' WHERE NOT EXISTS (SELECT 1 FROM "QuestionKnowledge" WHERE "questionId"=' + text(qid) + ' AND "knowledgePointId"=' + text(pointId) + ');');
    }
  }
}
const templates = [
  ['LAW-LAW-COURSE-MID','法学专业课期中综合模拟','期中：法理学、宪法学、民法总论、刑法总论与案例分析',100,120,[['法理学·单项选择题','choice',10,3],['宪法学·单项选择题','choice',10,3],['民法总论·单项选择题','choice',10,3],['刑法总论·单项选择题','choice',10,3],['法律文书写作与案例分析·案例分析题','essay',2,5]]],
  ['LAW-LAW-COURSE-FINAL','法学专业课期末综合模拟','期末：民法、刑法、行政法、诉讼法、商法与案例分析',100,120,[['民法分论·单项选择题','choice',10,3],['刑法分论·单项选择题','choice',10,3],['行政法与行政诉讼法·单项选择题','choice',10,3],['民事诉讼法·单项选择题','choice',10,3],['法律文书写作与案例分析·案例分析题','essay',2,5]]],
  ['LAW-LAW-CHAPTER','法学章节专项模拟','按章节掌握情况进行专项测试',100,60,[['民法总论·单项选择题','choice',10,5],['民法总论·名词解释/简答题','fill',3,10],['民法总论·案例分析题','essay',1,20]]]
];
for (const t of templates) {
  const tid = ident('template:' + t[0]);
  const config = { examMode: 'undergraduate', courseCode: 'LAW', sections: t[5].map(x => ({ name: x[0], type: x[1], count: x[2], scorePer: x[3] })) };
  sql.push('INSERT INTO "ExamTemplate" ("id","subjectId","name","description","config","totalScore","duration","createdAt","updatedAt") SELECT ' + text(tid) + ',s."id",' + text(t[1]) + ',' + text(t[2]) + ',' + json(config) + ',' + t[3] + ',' + t[4] + ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "Subject" s WHERE s."code"=' + text('LAW') + ' AND NOT EXISTS (SELECT 1 FROM "ExamTemplate" WHERE "id"=' + text(tid) + ');');
}
sql.push('COMMIT;');
await writeFile('generated-law-curriculum.sql', sql.join('\n'), 'utf8');
console.log('generated-law-curriculum.sql with ' + sql.length + ' statements');
