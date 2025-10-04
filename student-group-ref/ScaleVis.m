% Scale Visualization
close all
set(0, 'DefaultAxesFontSize', 18, 'DefaultAxesFontWeight','demi')
set(0, 'DefaultTextFontSize', 18, 'DefaultTextFontWeight','demi')
dataset = '23_24_2_45LS.mat';
load([dataset,'.mat']);
numMembers = 9;
numGroups = 5;
numStudents = size(data,1);
studentVis(data,names,1:6);
groupVis(data,numMembers,numGroups,names);
classVis(data);
%% Divide into two parts, one for random grouping, one for optimize
optMembers = numMembers;
randMembers = numMembers; % Comment is the groups are ballenced
optGroups = ceil(numGroups/2);
optStudents = optGroups*numMembers;
optInd = randperm(numStudents,optStudents);
optData = data(optInd,:);
optLSname = LSname(optInd,:);
optNames = names(optInd,:);
randGroups = numGroups - optGroups;
randStudents = numStudents - optStudents;
randData = data;
randLSname = LSname;
randNames = names;
randData(optInd,:) = [];
randLSname(optInd,:) = [];
randNames(optInd,:) = [];
save([dataset,'.mat'],'LSname','data','names','randLSname','randData','randNames',...
    'optData','optLSname','optNames');
%%
% The problem dimension is the number of students
para.data = optData;
para.numMembers = numMembers;
para.numGroups = optGroups;
para.coding = 'real';
para.plusOption = 1; % Tells the algorithm addtional parameter is added
newsol = ABC('StudentGroupingGRL',optStudents,200000,para);
load([dataset,'.mat']);
if newsol.FoundOptimum < sol.FoundOptimum
    disp(['Found new best: ',num2str(newsol.FoundOptimum)]);
    sol = newsol;
    save([dataset,'.mat'],'sol','-append');
end
%% Solving a combiniation problem
para.data = optData;
para.numMembers = numMembers;
para.numGroups = optGroups;
para.coding = 'natural';
para.plusOption = 1; % Tells the algorithm addtional parameter is added
newsol = SAD('StudentGroupingD',optStudents,200000,para);
load([dataset,'.mat']);
if newsol.FoundOptimum < sol.FoundOptimum
    disp(['Found new best: ',num2str(newsol.FoundOptimum)]);
    sol = newsol;
    save([dataset,'.mat'],'sol','-append');
end
%%
close all
file = dataset;
load([dataset,'.mat']);
figure
semilogy(sol.FEbest(:,2),sol.FEbest(:,1),'LineWidth',2);
xlim([1,200000]);
xlabel('代价函数计算次数');
ylabel('代价函数');
% 优化分组数据统计
para.data = optData;
para.numMembers = optMembers;
para.numGroups = optGroups;
[f,sg,stg,studentAssign] = StudentGroupingGender(sol.OptimumLocation,para);
[~,ind] = sort(sol.OptimumLocation); % Get the grouping index
groupVis(optData,optMembers,optGroups,optNames,ind);
optLSname(:,end) = table(studentAssign+remGroups);
writetable(LSname,[file,'_sep.xlsx']); % 先建立文件占坑，随后会更新
sheet2 = [{'组号','积极/沉思','感官/直觉','视觉/言语','顺序/全局','组内各维度标准差之和'};...
    [num2cell(linspace(1,optGroups,optGroups)'),num2cell(sg),num2cell(stg)];
    [{'标准差/平均'},num2cell(std(sg)),num2cell(mean(stg))]];
% sheet2(2:end-1,1) = num2cell(linspace(1,numGroups,numGroups)');
% sheet2(2:end-1,2:end-1) = num2cell(sg);
% sheet2(end,1) = {'标准差/平均'};
% sheet2(end,2:5) = num2cell(std(sg));
% sheet2(2:end-1,end) = num2cell(stg);
% sheet2(end,end) = num2cell(mean(stg));
writecell(sheet2,[file,'_sep.xlsx'],'sheet','优化分组统计');
% 顺序分组数据统计
para.data = randData;
para.numMembers = randMembers;
para.numGroups = randGroups;
[f,sg,stg,studentAssign] = StudentGroupingGender(1:size(randData,1),para);
groupVis(randData,randMembers,randGroups,randNames,1:size(randData,1));
randLSname(:,end) = table(studentAssign);
sheet3 = [{'组号','积极/沉思','感官/直觉','视觉/言语','顺序/全局','组内各维度标准差之和'};...
    [num2cell(linspace(1,randGroups,randGroups)'),num2cell(sg),num2cell(stg)];
    [{'标准差/平均'},num2cell(std(sg)),num2cell(mean(stg))]];
writecell(sheet3,[file,'_sep.xlsx'],'sheet','顺序分组统计');
LSname = [randLSname;optLSname];
writetable(LSname,[file,'_sep.xlsx']); % 最终写入
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