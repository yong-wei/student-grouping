%% �ʾ���
% Process a input ILS questioniar into the linerning style for each student
% �����Ա�
clear all
file = '303695498';
ILS = readtable([file,'.xlsx'],VariableNamingRule="preserve");
numStudents = size(ILS,1);
LS = zeros(numStudents,12); % learning Styles for each student
ind = 0:4:40;
% q = table2array(ILS(:,[11,15,18:end])); % ֻȡ�Ա��鳤�ͷ����д���
% 303667074ȡ����ͬ
q = table2array(ILS(:,[11,16,19:end-1])); % ֻȡ�Ա��鳤�ͷ����д���
q(q==2) = -1; % �Ա��鳤�����ѡ��2��Ϊ-1
q(q(:,1)==-1,1) = 0; % �Ա���Ů����Ϊ0
q(q(:,2)==-1,2) = 0; % �鳤�з��鳤��Ϊ0
for ii = 1:4
    LS(:,ii) = -sum(q(:,ind+ii+2),2); % ��ά��������
    LS(:,2*ii+3) = sum(q(:,ind+ii+2)==1,2); % ��ά����������
    LS(:,2*ii+4) = sum(q(:,ind+ii+2)==-1,2); % ��ά�ȸ�������
end
LS = [q(:,1),q(:,2),LS]; % ��ѧϰ����1������Ա�,��2������鳤
% ind = 1:numStudents;
% VariableNames = {'���','ѧ��','����','�Ա�','�鳤','����','רҵ','�ܷ�','����/��˼',...
%     '�й�/ֱ��','�Ӿ�/����','˳��/ȫ��','����','��˼','�й�','ֱ��','�Ӿ�',...
%     '����','˳��','ȫ��','�������'};
% LSname = [ILS(:,1),ILS(:,[12,8]),num2cell(LS(:,1:2)),...
%     ILS(:,[10,13,7]),num2cell(LS(:,3:end)),ILS(:,9)];
% 303667074ȡ����ͬ
VariableNames = {'���','ѧ��','����','�Ա�','�鳤','����','רҵ','������ò','ѧ���ɲ�','����/��˼',...
    '�й�/ֱ��','�Ӿ�/����','˳��/ȫ��','����','��˼','�й�','ֱ��','�Ӿ�',...
    '����','˳��','ȫ��','�������'};
LSname = [ILS(:,1),ILS(:,[12,8]),num2cell(LS(:,1:2)),...
    ILS(:,[10,13,14,15]),num2cell(LS(:,3:end)),ILS(:,9)];
LSname.Properties.VariableNames = VariableNames;
% data = table2array(LSname(:,[4:12,end]));
% 303667074ȡ����ͬ
data = table2array(LSname(:,[4:13,end]));
names = table2array(LSname(:,3));
writetable(LSname,[file,'LS.xlsx']);
% ȥ������Ҫ����Ľ�ʦ��ʣ��ѧ�����շ�������
ind = isnan(data(:,3));
data(ind,:) = []; names(ind) = []; LSname(ind,:) = [];
[~,ind] = sort(data(:,end));
data = data(ind,:); names = names(ind); LSname = LSname(ind,:);
save([file,'LS.mat'],'LSname','data','names');
%% ����רҵ����
clear
file = '282710075';
ILS = readtable([file,'.xlsx']);
ILSind = ILS(:,[1,11,7,8,10,13,16:end]);% �����ʾ����ݵ���������Ϊ��ţ�ѧ�ţ��������������Ա��鳤��
numStudents = size(ILSind,1);
LS = zeros(numStudents,15); % learning Styles for each student����һ��Ϊ�Ա�0ΪŮ��1Ϊ��
ind = 0:4:40;
q = table2array(ILSind(:,4:end));
q(q==2) = -1; % ����ѡ��2��Ϊ-1
q(q(:,2)==-1,2) = 0; % �Ա���Ů����Ϊ0
q(q(:,3)==-1,3) = 0; % �鳤�з��鳤��Ϊ0
for ii = 1:4
    LS(:,ii+3) = -sum(q(:,ind+ii+3),2); % ��ά��������
    LS(:,2*ii+6) = sum(q(:,ind+ii+3)==1,2); % ��ά����������
    LS(:,2*ii+7) = sum(q(:,ind+ii+3)==-1,2); % ��ά�ȸ�������
end
LS(:,1) = q(:,1); % ��ѧϰ����1���������
LS(:,2) = q(:,2); % ��ѧϰ����2������Ա�
LS(:,3) = q(:,3); % ��ѧϰ����3������鳤
% ind = 1:numStudents;
% LSname = [num2cell(ind'),ILSind(:,1:18)];
LSname = ILSind(:,[1:18,18]);
LSname(:,4:18) = num2cell(LS); % ���һ�з��������δȷ��
LSname.Properties.VariableNames = {'���','ѧ��','����','רҵ����','�Ա�','�鳤',...
    '����/��˼','�й�/ֱ��','�Ӿ�/����','˳��/ȫ��','����','��˼','�й�','ֱ��','�Ӿ�',...
    '����','˳��','ȫ��','�������'};
data = table2array(LSname(:,4:10));
names = table2array(LSname(:,3));
save([file,'LS.mat'],'LSname','data','names');
writetable(LSname,[file,'LS.xlsx']);