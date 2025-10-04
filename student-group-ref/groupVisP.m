function [dataFinal,labelFinal] = groupVisP(data,groupInd,names)
% data = [1,3,5,-3;-3,1,1,3;-1,-7,3,-1;-1,-1,-7,1;-7,5,7,9;-5,5,5,7;-3,3,7,1;-1,-1,-3,3;-3,3,7,-3;-3,5,3,3;-1,3,5,1;-1,5,3,1;1,1,-3,-1;-7,-3,7,-9;-5,-1,-1,1;-3,7,5,-1];
% data = [-3,-7,5,1;-7,5,5,1;-5,5,11,-5;-1,3,9,5;-1,1,1,-3;-1,-1,3,1;-3,3,3,7;-1,5,5,3;1,5,1,3;-1,5,9,-3;3,3,7,-11;-3,5,7,3;-9,7,-3,-1;-3,9,7,-3;-5,1,-1,1;1,-1,9,-3;-3,3,7,-5;1,9,9,3;1,-3,5,-3;-3,5,11,5;11,11,11,11;-1,3,-1,1;1,7,-1,3;3,5,11,1;3,3,7,-3;3,3,5,1;-1,-3,9,-3;9,5,3,7];
% 输入data结构：性别	组长	排名	专业	政治  学生干部	积极/沉思	感官/直觉	视觉/言语	顺序/全局   8个维度    分组序号
% 修正data结构：组长	性别	排名	总分	积极/沉思	感官/直觉	视觉/言语	顺序/全局
data = data(:,[2,1,3,7:10]);
dummyData = [0.5,-1,0.5,0,0,0,0,]; % 占位用的数据
% dummyData = min(data);
numGroups = length(groupInd);
numMembers = zeros(numGroups,1); % 每组人数
for ii = 1:numGroups
    numMembers(ii) = length(groupInd{ii});
end
dataIni = cell(numGroups,max(numMembers)+1);
Label = cell(numGroups,max(numMembers)+1);
for ii = 1:numGroups
    for jj = 1:max(numMembers)
        if jj <= numMembers(ii)
            dataIni{ii,jj} = data(groupInd{ii}(jj),:);
            if exist('names','var') % 如果给定姓名则用姓名表示
                Label{ii,jj} = names{groupInd{ii}(jj)};
            else
                Label{ii,jj} = ['S',num2str(groupInd{ii}(jj))];
            end
            if data(groupInd{ii}(jj),1) == 1 % 如果是组长
                Label{ii,jj} = [Label{ii,jj},'*'];
            end
        else
            dataIni{ii,jj} = dummyData;
            Label{ii,jj} = '';
        end
    end
    dataIni{ii,end} = mean(cell2mat(dataIni(ii,1:numMembers(ii))'));
    dataIni{ii,end}(2) = 1; % 小组信息性别设置为1防止被调整为红色
    Label{ii,end} = ['G',num2str(ii)];
end
% [numStudentsA,numStudents] = deal(size(data,1));
% if nargin < 5 % Default by natural sequence
%     ind = 1:numStudentsA;
% end
% ind(ind==0) = [];
% data = data(ind,:);
% if numGroups*numMembers > numStudentsA    
%     data = [data;repmat([0.5,-1,0,0,0,0,0],numGroups*numMembers-numStudents,1)];
%     numStudents = numGroups*numMembers;
% end
% LS = data(:,[2,3,1,4:end]); % 把性别调到第一列，组长第二列，排名第三列
% % data = data(1:numStudents,:);
% Label = cell(numStudents,1);
% for ii = 1:numStudents
%     if ii <= numStudentsA
%         Label{ii}  = ['S',num2str(ii)];
%     else
%         Label{ii} = '';
%     end
% end
% if exist('names','var') % 如果给定姓名则用姓名表示
%     Label(1:numStudentsA) = names;
% end
% Label(1:numStudentsA) = Label(ind);
% for ii = 1:numStudentsA
%     if data(ii,3) == 1
%         Label{ii} = [Label{ii},'*'];
%     end
% end
% dataIni = mat2cell(LS(:,3:end),ones(1,numStudents),5); % Prepare the data for adding group average
% A = reshape(dataIni,numGroups,numMembers)'; % Each column is a group
% A(end+1,:) = cell(1,numGroups); % The last row is the group average
% for ii = 1:numGroups
%     A{end,ii} = mean(cell2mat(A(1:end-1,ii)));
% end
% B = reshape(A,numStudents+numGroups,1); % The new data has numGroups more entries
dataFinal = dataIni';
dataFinal = cell2mat(dataFinal(:));
labelFinal = Label';
labelFinal = labelFinal(:);
% B = cell2mat(B);
% LabelIni = reshape(Label,numGroups,numMembers)';
% LabelG = cell(1,numGroups); % Labels for groups
% for ii = 1:numGroups
%     LabelG{ii} = ['G',num2str(ii)];
% end
% LabelIni = [LabelIni;LabelG];
% LabelIni = reshape(LabelIni,numStudents+numGroups,1);
% Show grouping
figure
fig = glyphplot(dataFinal(:,3:end),'standardize','column','obslabels',labelFinal,'LineWidth',2,...
    'grid',[numGroups,max(numMembers)+1]);
set(fig(:,3),'FontSize',12);
% 修改图中女生为红色
for ii = 1:size(dataFinal,1)
    if dataFinal(ii,2) == 0
        fig(ii,1).Color = [0.8500,0.3250,0.0980];
        fig(ii,2).Color = [0.8500,0.3250,0.0980];
    elseif dataFinal(ii,2) == -1
        fig(ii,1).Color = [1,1,1];
        fig(ii,2).Color = [1,1,1];
    end
    % if dataFinal(ii,2) ~= 1
    %     rowInd = mod(ii,numGroups);
    %     colInd = ceil(ii/numGroups);
    %     if rowInd == 0
    %         rowInd = numGroups;
    %     end

        % if dataFinal(ii,2) == 0
        %     fig((rowInd-1)*(max(numMembers)+1)+colInd,1).Color = [0.8500,0.3250,0.0980];
        %     fig((rowInd-1)*(max(numMembers)+1)+colInd,2).Color = [0.8500,0.3250,0.0980];
        % else
        %     fig((rowInd-1)*(max(numMembers)+1)+colInd,1).Color = [1,1,1];
        %     fig((rowInd-1)*(max(numMembers)+1)+colInd,2).Color = [1,1,1];
        % end
    % end
end
f = gcf;
f.Position = [2   171   749   626];