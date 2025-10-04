function [f,groupStat,studentAssign,groupInd] = StudentGroupingGRLP(x,ini)
% G: Gender考虑性别
% R: Ranking考虑排名
% L: Leader考虑组长
% P: Politics考虑政治面貌
if nargin > 1
    if strcmp(ini,'initial')
        f.FunctionName = 'StudentGrouping';
        f.FeasibleBounds = {0,1};
        f.ID = 'sg';
        f.GlobalMinima = 0;
        return
    else
        para = ini;
    end
end
[nPop,nVar] = size(x);
if isfield(para,'plusOption')
    data = para.data;
end
if ~isfield(para,'numMembers')
    n = 4; % Number of members in a group
else
    n = para.numMembers;
end
if ~isfield(para,'numGroups')
    m = nVar/n; % Number of groups
else
    m = para.numGroups;
end
if ~isfield(para,'coding')
    [~,ind] = sort(x,2);
else
    if strcmp(para.coding,'real')
        [~,ind] = sort(x,2);
    elseif strcmp(para.coding,'natural')
        ind = x;
    end
end
fixedPerson = sum(~isnan(ini.data(:,end))); % 固定分组的人数
getGroup = size(ini.data,1) - fixedPerson; % 需要分组的人数
% '性别','组长','排名','专业','总分'
data = normalize(ini.data(:,1:end-1),'range');
f = zeros(nPop,1);
stg = zeros(m,1); % 组内各维度标准差之和（越大越好）
sg = zeros(m,4); % 小组平均属性（各属性归一化值）
rank = zeros(m,1); % 组内排名数
gender = zeros(m,1); % 组内男生数
leader = zeros(m,1); % 组内组长数
major = zeros(m,1); % 组内专业数
politics = zeros(m,1); % 组内政治面貌分数
sleader = zeros(m,1); % 组内学生干部分数
ind = [ind+fixedPerson,zeros(nPop,n*m-nVar)];
studentAssign = zeros(nVar,1);
% fixedPos = [(1:fixedPerson)',ini.data(1:fixedPerson,end)];
for ii = 1:nPop
    groupInd = cell(m,1); % 采用cell结构应对每组人数可能不同的情况 
    maxFixGroup = max(ini.data(:,end));    
    for jj = 1:maxFixGroup
        groupInd{jj} = find(ini.data(:,end)==jj);
    end
    indLefted = ind(ii,1:getGroup);
    for jj = 1:m
        indLength = max(ini.groupNum(jj) - length(groupInd{jj}),0);
        groupInd{jj} = [groupInd{jj};indLefted(1:indLength)'];%,enmptyInd(1:indLength)} = indLefted(1:indLength);
        indLefted(1:indLength) = [];
    end
    for jj = 1:m
        gInd = groupInd{jj};
        % gInd(gInd==0) = [];
        studentAssign(gInd) = jj; % Save the group assignment
        g = data(gInd,:); % Grouping data
        % '性别','组长','排名','专业','总分'      
        gender(jj) = sum(g(:,1)==0); % 组内女生数
        leader(jj) = sum(g(:,2)); % 组内组长数
        rank(jj) = sum(g(:,3)); % 组内排名数
        major(jj) = length(unique(g(:,4))); % 组内不同专业数
        politics(jj) = sum(g(:,5)); % 组内政治面貌分数
        sleader(jj) = sum(g(:,6)); % 组内学生干部分数
        sg(jj,:) = mean(g(:,7:10)); % 小组平均属性（各组越接近越好）
        stg(jj) = sum(std(g(:,7:10))); % 组内各维度标准差之和（越大越好）
%         sg(jj,:) = abs(sum(g)); % Sum of each feature
%         stg(jj) = std(abs(sum(g))); % Standard dev of each group       
    end
    f(ii) = std(gender) + std(leader) + std(rank)/2 + std(major)/2 + ...
        std(politics) + std(sleader) + 4*mean(std(sg)) + 4/sum(stg); % Standard dev of all groups
end
groupStat.gender = gender;
groupStat.leader = leader;
groupStat.rank   = rank;
groupStat.major  = major;
groupStat.politics  = politics;
groupStat.sleader  = sleader;
groupStat.sg     = sg;
groupStat.stg    = stg;