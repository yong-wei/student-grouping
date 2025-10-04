function studentVis(data,names,ind)
data = data(ind,:);
names = names(ind);
numStudents = length(ind);
for ii = 1:numStudents
    if data(ii,3) == 1
        names{ii} = [names{ii},'*'];
    end
end
polyRadius = 22;
[x,y] = pol2cart(2*pi/5*(0:4)+pi/2,ones(1,5)*polyRadius);
xl = x*1.2;
yl = y*1.2;
tiledlayout('flow','Padding','tight','TileSpacing','tight')
for ii = 1:length(ind)
    nexttile
    % v = [22 0; 0 22; -22 0; 0 -22;
    %      11 0; 0 11; -11 0; 0 -11;
    %     data(ii,2)+11 0; 0 data(ii,3)+11; -(data(ii,4)+11) 0; 0 -(data(ii,5)+11)];
    d = data(ii,[1,4:end]);
    d(:,1) = (1 - d(:,1))*22; % 将排名取反后放大到[0,22]区间
    d(:,2:end) = d(2:end) + 11; % 学习风格平移到[0,22]区间
    [xd,yd] = pol2cart(2*pi/5*(0:4)+pi/2,d); % 将数据转化为坐标，以数据大小为模
    v = [x',y';x'/2,y'/2;xd',yd'];
    f = [1 2 3 4; 5 6 7 8; 9 10 11 12];
    hold on
    if data(ii,2) == 1
        c = 'blue';
    else
        c = 'red';
    end
    % patch('Faces',1:4,'Vertices',v(1:4,:),'FaceColor',[.6,.6,.6],'FaceAlpha',.2);
    % patch('Faces',1:4,'Vertices',v(5:8,:),'FaceColor',[1,1,1],'FaceAlpha',.2);
    % patch('Faces',1:4,'Vertices',v(9:12,:),'FaceColor',c,'FaceAlpha',.3);

    patch('Faces',1:5,'Vertices',v(1:5,:),'FaceColor',[.6,.6,.6],'FaceAlpha',.2);
    patch('Faces',1:5,'Vertices',v(6:10,:),'FaceColor',[1,1,1],'FaceAlpha',.2);
    patch('Faces',1:5,'Vertices',v(11:15,:),'FaceColor',c,'FaceAlpha',.3);
%     plot([22,0,-22,0]',[0,22,0,-22]','LineStyle','--','Color',[0.6,0.6,0.6]);
%     hold on
%     plot([11,0,-11,0]',[0,11,0,-11]','LineStyle','--','Color',[0.6,0.6,0.6]);
%     plot([data(ii,2)+11,0,-(data(ii,4)+11),0],[0,data(ii,3)+11,0,...
%         -(data(ii,5)+11)]);,'Rotation',90
    text(xl(1),yl(1),'排名','HorizontalAlignment','center');
    text(xl(2),yl(2),'积极/沉思','HorizontalAlignment','center','Rotation',72);
    text(xl(3),yl(3),'感官/直觉','HorizontalAlignment','center','Rotation',-36);
    text(xl(4),yl(4),'视觉/言语','HorizontalAlignment','center','Rotation',36);
    text(xl(5),yl(5),'顺序/全局','HorizontalAlignment','center','Rotation',-72);
    % text(0,-26,names{ii},'HorizontalAlignment','center');
    title(names{ii})
    hold off
    axis equal
    xlim([-35,35])
    ylim([-35,35])
    axis off
end
f = gcf;
f.Position = [2   171   749   626];