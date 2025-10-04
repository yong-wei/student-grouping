function [f,groupStat,studentAssign,groupInd] = StudentGroupingGRLP(x,ini)
% G: Gender�����Ա�
% R: Ranking��������
% L: Leader�����鳤
% P: Politics����������ò
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
fixedPerson = sum(~isnan(ini.data(:,end))); % �̶����������
getGroup = size(ini.data,1) - fixedPerson; % ��Ҫ���������
% '�Ա�','�鳤','����','רҵ','�ܷ�'
data = normalize(ini.data(:,1:end-1),'range');
f = zeros(nPop,1);
stg = zeros(m,1); % ���ڸ�ά�ȱ�׼��֮�ͣ�Խ��Խ�ã�
sg = zeros(m,4); % С��ƽ�����ԣ������Թ�һ��ֵ��
rank = zeros(m,1); % ����������
gender = zeros(m,1); % ����������
leader = zeros(m,1); % �����鳤��
major = zeros(m,1); % ����רҵ��
politics = zeros(m,1); % ����������ò����
sleader = zeros(m,1); % ����ѧ���ɲ�����
ind = [ind+fixedPerson,zeros(nPop,n*m-nVar)];
studentAssign = zeros(nVar,1);
% fixedPos = [(1:fixedPerson)',ini.data(1:fixedPerson,end)];
for ii = 1:nPop
    groupInd = cell(m,1); % ����cell�ṹӦ��ÿ���������ܲ�ͬ����� 
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
        % '�Ա�','�鳤','����','רҵ','�ܷ�'      
        gender(jj) = sum(g(:,1)==0); % ����Ů����
        leader(jj) = sum(g(:,2)); % �����鳤��
        rank(jj) = sum(g(:,3)); % ����������
        major(jj) = length(unique(g(:,4))); % ���ڲ�ͬרҵ��
        politics(jj) = sum(g(:,5)); % ����������ò����
        sleader(jj) = sum(g(:,6)); % ����ѧ���ɲ�����
        sg(jj,:) = mean(g(:,7:10)); % С��ƽ�����ԣ�����Խ�ӽ�Խ�ã�
        stg(jj) = sum(std(g(:,7:10))); % ���ڸ�ά�ȱ�׼��֮�ͣ�Խ��Խ�ã�
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