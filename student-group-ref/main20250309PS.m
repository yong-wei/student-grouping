% Scale Visualization
close all
default
clear
% set(0, 'DefaultAxesFontSize', 18, 'DefaultAxesFontWeight','demi')
% set(0, 'DefaultTextFontSize', 18, 'DefaultTextFontWeight','demi')
% 专门处理包括政治面貌和学生干部的数据集：后五种
% 下面提前规定每一组的人数，免去后续自动规划每组人数时带来的混乱和不便，这样也支持每组不同人数
% 303667074
% groupNum = [ones(1,14)*6,5,6,6,6,7];
% 303693827
% groupNum = [ones(1,13)*6,7,7,7,7,7,7];
% 303694304
% groupNum = [7,7,7,ones(1,15)*8];
% 303694553
% groupNum = [ones(1,21)*6,2];
% 303695498
groupNum = ones(1,15)*8; groupNum(7) = 7;
dataset = '303695498partialLS';
LSname = readtable([dataset,'.xlsx'],VariableNamingRule="preserve");
names = table2cell(LSname(:,3));
data = table2array(LSname(:,4:22));
numGroups = length(groupNum);
save([dataset,'.mat'],'LSname','data','names','-append');
% numStudents = numMembers*numMembers;
% data = data(1:numStudents,:);
% names = names(1:numStudents);
% for ii = 1:ceil(size(data,1)/12)
%     if ii*12 > size(data,1)
%         terminal = size(data,1);
%     else
%         terminal = ii*12;
%     end
%     figure
%     studentVis(data,names,(ii-1)*12+1:terminal);
% end
% groupVis(data,numMembers,numGroups,names);
classVis(data(:,[7:10]));
%% Divide into two parts, one for random grouping, one for optimize
% optMembers = numMembers;
% randMembers = numMembers; % Comment is the groups are ballenced
% optGroups = ceil(numGroups/2);
% optStudents = optGroups*numMembers;
% optInd = randperm(numStudents,optStudents);
% optData = data(optInd,:);
% optLSname = LSname(optInd,:);
% optNames = names(optInd,:);
% randGroups = numGroups - optGroups;
% randStudents = numStudents - optStudents;
% randData = data;
% randLSname = LSname;
% randNames = names;
% randData(optInd,:) = [];
% randLSname(optInd,:) = [];
% randNames(optInd,:) = [];
% save([dataset,'.mat'],'LSname','data','names','randLSname','randData','randNames',...
%     'optData','optLSname','optNames');
%%
% The problem dimension is the number of students
numStudents = sum(isnan(data(:,end))); % 实际要分组的人数
para.data = data;
para.groupNum = groupNum;
para.numGroups = numGroups;
para.coding = 'real';
para.plusOption = 1; % Tells the algorithm addtional parameter is added
newsol = ABC('StudentGroupingGRLP',numStudents,200000,para);
load([dataset,'.mat']);
if newsol.FoundOptimum < sol.FoundOptimum
    disp(['Found new best: ',num2str(newsol.FoundOptimum)]);
    sol = newsol;
    save([dataset,'.mat'],'sol','-append');
end
%% Solving a combiniation problem
% para.data = optData;
% para.numMembers = numMembers;
% para.numGroups = optGroups;
% para.coding = 'natural';
% para.plusOption = 1; % Tells the algorithm addtional parameter is added
% newsol = SAD('StudentGroupingD',optStudents,200000,para);
% load([dataset,'.mat']);
% if newsol.FoundOptimum < sol.FoundOptimum
%     disp(['Found new best: ',num2str(newsol.FoundOptimum)]);
%     sol = newsol;
%     save([dataset,'.mat'],'sol','-append');
% end
%%
close all
file = dataset;
load([dataset,'.mat']);
figure
semilogy(sol.FEbest(:,2),sol.FEbest(:,1),'LineWidth',2);
xlim([1,20000]);
xlabel('代价函数计算次数');
ylabel('代价函数');
% 优化分组数据统计
para.data = data;%(isnan(data(:,end)),:);
para.numGroups = numGroups;
[~,g,studentAssign,groupInd] = StudentGroupingGRLP(sol.OptimumLocation,para);
[dataFinal,labelFinal] = groupVisP(data,groupInd,names);
% studentAssign = [studentAssign;zeros(size(LSname,1)-numStudents,1)];
LSname(:,end) = table(studentAssign);
save([dataset,'.mat'],'LSname','groupInd','-append');
writetable(LSname,[file,'_sep.xlsx']); % 先建立文件占坑，随后会更新
gstat = [g.sg,g.stg,g.gender,g.leader,g.major,g.rank,g.politics,g.sleader];
sheet2 = [{'组号','积极/沉思','感官/直觉','视觉/言语','顺序/全局','组内各维度标准差之和','组内女生数','组内组长数','组内专业数','组内排名和','组内政治面貌总分','组内干部总分'};...
    [num2cell(linspace(1,numGroups,numGroups)'),num2cell(gstat)];
    [{'标准差/平均'},num2cell(std(g.sg)),num2cell(mean(gstat(:,5:end)))]];
writecell(sheet2,[file,'_sep.xlsx'],'sheet','优化分组统计');

% 顺序分组数据统计
% para.data = randData;
% para.numMembers = randMembers;
% para.numGroups = randGroups;
% [f,sg,stg,studentAssign] = StudentGroupingGRL(1:size(data,1),para);
% groupVis(data,numMembers,numGroups,names,1:size(data,1));
% % studentAssign = [studentAssign;zeros(size(LSname,1)-numStudents,1)];
% % randLSname(:,end) = table(studentAssign);
% sheet3 = [{'组号','积极/沉思','感官/直觉','视觉/言语','顺序/全局','组内各维度标准差之和'};...
%     [num2cell(linspace(1,numGroups,numGroups)'),num2cell(g.sg),num2cell(g.stg)];
%     [{'标准差/平均'},num2cell(std(g.sg)),num2cell(mean(g.stg))]];
% writecell(sheet3,[file,'_sep.xlsx'],'sheet','顺序分组统计');
% LSname = [randLSname;optLSname];
% writetable(LSname,[file,'_sep.xlsx']); % 最终写入
%% 分组绘制人脸图
close all
load([dataset,'.mat']);
grid = [8,9];
pages = ceil(size(dataFinal,1)/(grid(1)*grid(2)));
showRank = 0;
studentVisFaceP(dataFinal,labelFinal,grid,pages,showRank);
%% Test face
close all
LS = ones(17*7,17)*0.5; % 中性基础数据
for ii = 1:17 % 每个特征取均匀变换的7个数据
    LS((ii-1)*7+1:ii*7,ii) = linspace(0,1,7);
end
% LS = repmat((1:56)',1,17);
glyphplot(LS,'glyph','face','features',1:17,...
            'standardize','column','LineWidth',2,...
            'grid',[17,7],'page',1);   
position = [2     1   749   796];
axis off
featureNames = {
'1','Size of face';
'2','Forehead/jaw relative arc length';
'3','Shape of forehead';
'4','Shape of jaw';
'5','Width between eyes';
'6','Vertical position of eyes';
'7','Height of eyes';
'8','Width of eyes (this also affects eyebrow width)';
'9','Angle of eyes (this also affects eyebrow angle)';
'10','Vertical position of eyebrows';
'11','Width of eyebrows (relative to eyes)';
'12','Angle of eyebrows (relative to eyes)';
'13','Direction of pupils';
'14','Length of nose';
'15','Vertical position of mouth';
'16','Shape of mouth';
'17','Mouth arc length'};
for ii = 1:17
    text(0,18-ii,featureNames{ii,1},'HorizontalAlignment','right');
    text(8,18-ii,featureNames{ii,2},'HorizontalAlignment','left');
end
xlim([0.5,16.5]);
f = gcf;
f.Position = position; 
%% Score analysis
% Abtain the socres of each assignment and back
close all
% Indivadual or Grouped assignment
% I1    G1      I2      G2      G3      I3      I4      I5
score = [
9.75	8.80	9.33	15.00	13.25	8.75	9.67	24.34
8.86	8.50	9.33	13.50	13.01	7.00	9.75	21.00
9.33	8.76	8.20	13.75	13.00	8.67	9.25	23.00
8.80	9.00	8.50	14.00	13.25	9.00	8.80	22.33
8.20	9.33	8.60	15.00	14.00	7.90	9.20	23.34
9.25	9.40	8.50	14.00	14.60	9.00	7.50	22.50
8.80	9.80	9.00	14.00	13.60	7.80	9.00	24.34
8.70	9.70	8.57	11.00	13.34	8.90	8.90	23.50
9.33	9.40	8.00	14.20	13.50	6.66	9.25	18.50
10.00	9.60	7.60	12.00	13.67	8.00	9.00	23.68
6.75	8.40	8.50	11.50	11.75	9.00	7.80	22.50
7.68	8.50	8.25	15.00	14.25	8.67	9.75	21.00
10.00	8.90	8.80	14.25	14.20	9.00	7.90	24.00
9.68	9.40	8.40	12.70	13.60	8.34	8.20	22.50
8.26	9.34	8.58	13.50	12.50	9.76	7.00	20.32
9.23	8.50	8.40	15.00	12.34	9.67	7.79	23.50];
total = [10.0
10.0
10.0
15.0
15.0
10.0
10.0
25.0];
standardScore = score./(repmat(total',16,1))*100;
standardScore = standardScore(:,[2,4,5,1,3,6,7,8]);
boxplot(standardScore,{'G1','G2','G3','I1','I2','I3','I4','I5'});%,'Notch','on'
xlabel('任务');
ylabel('得分率分布');
groupScore = standardScore(:,1:3);
indivScore = standardScore(:,4:end);
figure
h = boxplot([groupScore,indivScore],[ones(1,48),2*ones(1,80)],'Label',{'分组','个人'},'Notch','on');%,'Notch','on'
xlabel('任务');
ylabel('得分率分布');
% groupScore(groupScore==100) = [];
% groupScore = [groupScore,100];
% indivScore(indivScore==100) = [];
% indivScore = [indivScore,100];
figure
subplot(2,2,1)
normplot(groupScore(:));
subplot(2,2,2)
normplot(indivScore(:));
subplot(2,2,3)
histogram(groupScore(:),60:2.5:100);
subplot(2,2,4)
histogram(indivScore(:),60:2.5:100);
lillietest(groupScore(:))
lillietest(indivScore(:))
[h,sig,ci] = ttest2(groupScore(:),indivScore(:),'Vartype','unequal') % Test hypithesis that two vectors come from same mean
[h,p,ci,stats] = vartest2(groupScore(:),indivScore(:))